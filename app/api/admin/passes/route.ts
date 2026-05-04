import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Pass from "@/models/Pass";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { isObjectId, readJson } from "@/lib/security";

function isAdminEmail(email?: string | null) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return !!email && adminEmails.includes(email.trim().toLowerCase());
}

async function getAdminUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return null;
  }

  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  if (user.role !== "admin" && isAdminEmail(user.email)) {
    user.role = "admin";
    await user.save();
  }

  if (user.role !== "admin") {
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

export async function GET() {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const pendingPasses = await Pass.find({
      approvalStatus: "Pending",
      passType: { $ne: "LongLeave" },
    })
      .populate("user", "name email phone hostel room")
      .sort({ createdAt: -1 })
      .lean();

    const logs = await Pass.find({
      approvalStatus: { $in: ["Approved", "Rejected"] },
    })
      .populate("user", "name email phone hostel room")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    const formatPass = (pass: Record<string, unknown>) => ({
      ...pass,
      timeOut: pass.timeOut instanceof Date ? formatTime(pass.timeOut) : pass.timeOut,
      timeIn: pass.timeIn instanceof Date ? formatTime(pass.timeIn) : pass.timeIn,
      approvalStatus: pass.approvalStatus || "Pending",
    });

    return NextResponse.json({
      passes: pendingPasses.map(formatPass),
      logs: logs.map(formatPass),
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Fetch admin passes error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { passId, action } = body as { passId?: unknown; action?: unknown };

    if (!isObjectId(passId) || typeof action !== "string" || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid approval request" }, { status: 400 });
    }

    const update =
      action === "approve"
        ? {
            approvalStatus: "Approved",
            approvedBy: admin._id,
            approvedAt: new Date(),
            rejectedAt: undefined,
          }
        : {
            approvalStatus: "Rejected",
            rejectedAt: new Date(),
            approvedBy: undefined,
            approvedAt: undefined,
          };

    const pass = await Pass.findOneAndUpdate(
      { _id: passId, passType: { $ne: "LongLeave" } },
      update,
      { new: true }
    );

    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    if (action === "reject") {
      await Notification.create({
        user: pass.user,
        pass: pass._id,
        title: "Pass request rejected",
        message: `Your pass request for ${pass.place} was rejected by the warden/admin.`,
        type: "error",
      });
    }

    return NextResponse.json({ pass }, { status: 200 });
  } catch (error: unknown) {
    console.error("Approve pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
