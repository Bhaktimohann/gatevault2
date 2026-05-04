import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Pass from "@/models/Pass";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { isObjectId, readJson } from "@/lib/security";

async function getHodUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return null;
  }

  await dbConnect();

  const user = await User.findById(userId);
  if (!user || user.role !== "hod") {
    return null;
  }

  return user;
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatPass(pass: Record<string, unknown>) {
  return {
    ...pass,
    timeOut: pass.timeOut instanceof Date ? formatTime(pass.timeOut) : pass.timeOut,
    timeIn: pass.timeIn instanceof Date ? formatTime(pass.timeIn) : pass.timeIn,
    leaveStartDate: pass.leaveStartDate instanceof Date ? pass.leaveStartDate.toISOString() : pass.leaveStartDate,
    leaveEndDate: pass.leaveEndDate instanceof Date ? pass.leaveEndDate.toISOString() : pass.leaveEndDate,
    hodApprovalStatus: pass.hodApprovalStatus || "Pending",
    approvalStatus: pass.approvalStatus || "Pending",
    wardenApprovalStatus: pass.wardenApprovalStatus || "Pending",
  };
}

export async function GET() {
  try {
    const hod = await getHodUser();

    if (!hod) {
      return NextResponse.json({ message: "HOD access required" }, { status: 403 });
    }

    const pendingPasses = await Pass.find({
      passType: "LongLeave",
      hodApprovalStatus: "Pending",
    })
      .populate("user", "name email phone hostel room semester section")
      .sort({ createdAt: -1 })
      .lean();

    const logs = await Pass.find({
      passType: "LongLeave",
      hodApprovalStatus: { $in: ["Approved", "Rejected"] },
    })
      .populate("user", "name email phone hostel room semester section")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      passes: pendingPasses.map(formatPass),
      logs: logs.map(formatPass),
    }, { status: 200 });
  } catch (error) {
    console.error("Fetch HOD passes error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const hod = await getHodUser();

    if (!hod) {
      return NextResponse.json({ message: "HOD access required" }, { status: 403 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { passId, action } = body as { passId?: unknown; action?: unknown };

    if (!isObjectId(passId) || typeof action !== "string" || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid HOD approval request" }, { status: 400 });
    }

    const update =
      action === "approve"
        ? {
            hodApprovalStatus: "Approved",
            hodApprovedBy: hod._id,
            hodApprovedAt: new Date(),
            hodRejectedAt: undefined,
            wardenApprovalStatus: "Pending",
            approvalStatus: "Pending",
          }
        : {
            hodApprovalStatus: "Rejected",
            hodRejectedAt: new Date(),
            hodApprovedBy: undefined,
            hodApprovedAt: undefined,
            wardenApprovalStatus: "Rejected",
            approvalStatus: "Rejected",
            rejectedAt: new Date(),
            approvedBy: undefined,
            approvedAt: undefined,
          };

    const pass = await Pass.findOneAndUpdate(
      { _id: passId, passType: "LongLeave" },
      update,
      { new: true }
    );

    if (!pass) {
      return NextResponse.json({ message: "Long leave request not found" }, { status: 404 });
    }

    if (action === "reject") {
      await Notification.create({
        user: pass.user,
        pass: pass._id,
        title: "Long leave rejected",
        message: `Your long leave request for ${pass.place} was rejected by the HOD.`,
        type: "error",
      });
    }

    return NextResponse.json({ pass }, { status: 200 });
  } catch (error) {
    console.error("Update HOD pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
