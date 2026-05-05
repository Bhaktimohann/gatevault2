import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import Pass from "@/models/Pass";
import User from "@/models/User";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { isObjectId, readJson } from "@/lib/security";
import { formatDisplayPassTime } from "@/lib/passDateTime";

async function getWardenUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) return null;

  await dbConnect();

  const user = await User.findById(userId);
  if (!user || user.role !== "warden") return null;

  return user;
}

function formatPass(pass: Record<string, unknown>) {
  return {
    ...pass,
    timeOut: formatDisplayPassTime(pass.timeOut, pass.requestedTimeOut),
    timeIn: formatDisplayPassTime(pass.timeIn, pass.requestedTimeIn),
    leaveStartDate: pass.leaveStartDate instanceof Date ? pass.leaveStartDate.toISOString() : pass.leaveStartDate,
    leaveEndDate: pass.leaveEndDate instanceof Date ? pass.leaveEndDate.toISOString() : pass.leaveEndDate,
    approvalStatus: pass.approvalStatus || "Pending",
    hodApprovalStatus: pass.hodApprovalStatus || "Pending",
    wardenApprovalStatus: pass.wardenApprovalStatus || pass.approvalStatus || "Pending",
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getStudentIdsForHostel(hostel: string) {
  const students = await User.find({
    role: "student",
    hostel: { $regex: `^${escapeRegex(hostel)}$`, $options: "i" },
  })
    .select("_id")
    .lean();

  return students.map((student) => student._id);
}

export async function GET() {
  try {
    const warden = await getWardenUser();

    if (!warden) {
      return NextResponse.json({ message: "Warden access required" }, { status: 403 });
    }

    const hostel = String(warden.hostel || "").trim();
    if (!hostel) {
      return NextResponse.json({ message: "Assign a hostel to this warden account before reviewing long leave requests" }, { status: 400 });
    }

    const studentIds = await getStudentIdsForHostel(hostel);

    const pendingPasses = await Pass.find({
      passType: "LongLeave",
      hodApprovalStatus: "Approved",
      approvalStatus: "Pending",
      user: { $in: studentIds },
    })
      .populate("user", "name email phone hostel room semester section")
      .sort({ hodApprovedAt: -1, createdAt: -1 })
      .lean();

    const logs = await Pass.find({
      passType: "LongLeave",
      hodApprovalStatus: "Approved",
      approvalStatus: { $in: ["Approved", "Rejected"] },
      user: { $in: studentIds },
    })
      .populate("user", "name email phone hostel room semester section")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(
      {
        passes: pendingPasses.map(formatPass),
        logs: logs.map(formatPass),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch warden passes error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const warden = await getWardenUser();

    if (!warden) {
      return NextResponse.json({ message: "Warden access required" }, { status: 403 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { passId, action } = body as { passId?: unknown; action?: unknown };

    if (!isObjectId(passId) || typeof action !== "string" || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid warden approval request" }, { status: 400 });
    }

    const hostel = String(warden.hostel || "").trim();
    if (!hostel) {
      return NextResponse.json({ message: "Assign a hostel to this warden account before reviewing long leave requests" }, { status: 400 });
    }

    const studentIds = await getStudentIdsForHostel(hostel);

    const update =
      action === "approve"
        ? {
            approvalStatus: "Approved",
            wardenApprovalStatus: "Approved",
            approvedBy: warden._id,
            approvedAt: new Date(),
            rejectedAt: undefined,
          }
        : {
            approvalStatus: "Rejected",
            wardenApprovalStatus: "Rejected",
            rejectedAt: new Date(),
            approvedBy: undefined,
            approvedAt: undefined,
          };

    const pass = await Pass.findOneAndUpdate(
      { _id: passId, passType: "LongLeave", hodApprovalStatus: "Approved", user: { $in: studentIds } },
      update,
      { new: true }
    );

    if (!pass) {
      return NextResponse.json({ message: "HOD-approved long leave request not found" }, { status: 404 });
    }

    await Notification.create({
      user: pass.user,
      pass: pass._id,
      title: action === "approve" ? "Long leave approved" : "Long leave rejected",
      message:
        action === "approve"
          ? `Your long leave request for ${pass.place} was approved by the warden. Your QR is now available.`
          : `Your long leave request for ${pass.place} was rejected by the warden.`,
      type: action === "approve" ? "success" : "error",
    });

    return NextResponse.json({ pass }, { status: 200 });
  } catch (error) {
    console.error("Update warden pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
