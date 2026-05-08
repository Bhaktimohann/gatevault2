import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { verifyQrToken } from "@/lib/qrToken";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import {
  DEFAULT_SHORT_PASS_DURATION_HOURS,
  DEFAULT_SHORT_PASS_GRACE_MINUTES,
  evaluateShortPass,
  minutesBetween,
} from "@/lib/shortPassLogic";
import Pass from "@/models/Pass";
import Notification from "@/models/Notification";

type SessionUser = {
  id: string;
  role?: string;
};

type PopulatedScanPass = {
  _id: { toString(): string };
  phone: string;
  place: string;
  user?: {
    name?: string;
    email?: string;
  };
  scannedOutAt?: Date;
  scannedOutBy?: { toString(): string };
  scannedInAt?: Date;
  scannedInBy?: { toString(): string };
};

function isUnscannedOutQuery() {
  return {
    $or: [{ scannedOutAt: { $exists: false } }, { scannedOutAt: null }],
  };
}

function isUnscannedInQuery() {
  return {
    $or: [{ scannedInAt: { $exists: false } }, { scannedInAt: null }],
  };
}

function getSessionUser(session: { user?: unknown }): SessionUser | null {
  const user = session.user as Partial<SessionUser> | undefined;
  return user?.id ? { id: user.id, role: user.role } : null;
}

function canUseScanner(user: SessionUser) {
  return user.role === "security" || user.role === "admin";
}

function mapScanLog(pass: PopulatedScanPass, direction: "Out" | "In", scannedAt: Date) {
  return {
    id: `${pass._id}-${direction}-${scannedAt.toISOString()}`,
    student: pass.user?.name || "Student",
    email: pass.user?.email || pass.phone,
    place: pass.place,
    direction,
    scannedAt: scannedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const sessionUser = session ? getSessionUser(session) : null;

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!canUseScanner(sessionUser)) {
      return NextResponse.json({ message: "Security access required" }, { status: 403 });
    }

    const userId = sessionUser.id;
    const isAdmin = sessionUser.role === "admin";

    await dbConnect();

    const outQuery = isAdmin ? { scannedOutAt: { $exists: true, $ne: null } } : { scannedOutBy: userId };
    const inQuery = isAdmin ? { scannedInAt: { $exists: true, $ne: null } } : { scannedInBy: userId };

    const [scannedOut, scannedIn, recentPasses] = await Promise.all([
      Pass.countDocuments(outQuery),
      Pass.countDocuments(inQuery),
      Pass.find({ $or: [outQuery, inQuery] })
        .populate("user", "name email")
        .sort({ updatedAt: -1 })
        .limit(8),
    ]);

    const logs = (recentPasses as PopulatedScanPass[])
      .flatMap((pass) => {
        const entries = [];

        if (pass.scannedOutAt && (isAdmin || String(pass.scannedOutBy) === userId)) {
          entries.push(mapScanLog(pass, "Out", pass.scannedOutAt));
        }

        if (pass.scannedInAt && (isAdmin || String(pass.scannedInBy) === userId)) {
          entries.push(mapScanLog(pass, "In", pass.scannedInAt));
        }

        return entries;
      })
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, 6);

    return NextResponse.json({
      stats: {
        totalScans: scannedOut + scannedIn,
        scannedOut,
        scannedIn,
      },
      logs,
    });
  } catch (error: unknown) {
    console.error("Fetch scan stats error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);

    const sessionUser = session ? getSessionUser(session) : null;

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!canUseScanner(sessionUser)) {
      return NextResponse.json({ message: "Security access required" }, { status: 403 });
    }

    const limit = rateLimit(`scan:${sessionUser.id}:${getClientIp(req)}`, 60, 60000);

    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many scan attempts" }, { status: 429 });
    }

    const body = (await req.json()) as { qrData?: unknown };
    const { qrData } = body;

    if (typeof qrData !== "string") {
      return NextResponse.json({ message: "Invalid QR code" }, { status: 400 });
    }

    let token: ReturnType<typeof verifyQrToken>;

    try {
      token = verifyQrToken(qrData);
    } catch {
      return NextResponse.json({ message: "Invalid or expired QR code" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(token.passId) || !mongoose.Types.ObjectId.isValid(token.userId)) {
      return NextResponse.json({ message: "Invalid QR code" }, { status: 400 });
    }

    await dbConnect();

    const now = new Date();
    const pass = await Pass.findOne({
      _id: token.passId,
      user: token.userId,
    });

    if (!pass) {
      return NextResponse.json({ message: "QR code is invalid" }, { status: 400 });
    }

    if ((pass.approvalStatus || "Approved") !== "Approved") {
      return NextResponse.json({ message: "Pass is not approved yet" }, { status: 400 });
    }

    if (pass.passType === "LongLeave" && pass.hodApprovalStatus !== "Approved") {
      return NextResponse.json({ message: "Long leave is not approved by HOD yet" }, { status: 400 });
    }

    if (pass.passType === "LongLeave" && (pass.wardenApprovalStatus || pass.approvalStatus) !== "Approved") {
      return NextResponse.json({ message: "Long leave is not approved by warden yet" }, { status: 400 });
    }

    if (pass.timeOut > now) {
      return NextResponse.json({ message: "This pass is not valid for scanning yet" }, { status: 400 });
    }

    if (pass.passType !== "LongLeave" && !pass.scannedOutAt && now > pass.timeIn) {
      const overdueShortPass = evaluateShortPass({
        outTime: pass.timeOut,
        expectedReturnTime: pass.timeIn,
        allowedDurationHours: pass.allowedDurationHours || DEFAULT_SHORT_PASS_DURATION_HOURS,
        graceMinutes: pass.graceMinutes || DEFAULT_SHORT_PASS_GRACE_MINUTES,
        currentTime: now,
      });

      pass.shortPassStatus = overdueShortPass.status;
      pass.expectedReturnTime = overdueShortPass.expectedReturnTime;
      pass.lateDurationMinutes = overdueShortPass.lateDurationMinutes;
      await pass.save();

      return NextResponse.json({ message: "This short pass is overdue" }, { status: 400 });
    }

    if (
      pass.passType === "LongLeave" &&
      pass.timeIn <= now &&
      pass.status !== "Returned" &&
      !pass.scannedOutAt
    ) {
      pass.status = "Expired";
      pass.qrTokenHash = undefined;
      pass.qrTokenExpiresAt = undefined;
      await pass.save();
      return NextResponse.json({ message: "This pass has expired" }, { status: 400 });
    }

    let query: Record<string, unknown>;
    let update: Record<string, unknown>;
    let message = "";
    let lateReturnMinutes = 0;

    if (!pass.scannedOutAt && (pass.status === "Active" || pass.status === "Pending")) {
      query = {
        _id: pass._id,
        ...isUnscannedOutQuery(),
        status: { $in: ["Active", "Pending"] },
      };
      update = {
        $set: {
          status: "Out",
          scannedOutAt: now,
          scannedOutBy: sessionUser.id,
        },
        $unset: {
          qrTokenHash: "",
          qrTokenExpiresAt: "",
        },
      };
      message = "Student Scanned OUT";
    } else if (!pass.scannedInAt && (pass.status === "Out" || pass.scannedOutAt)) {
      const shortPassReturn =
        pass.passType !== "LongLeave"
          ? evaluateShortPass({
              outTime: pass.timeOut,
              inTime: now,
              expectedReturnTime: pass.timeIn,
              allowedDurationHours: pass.allowedDurationHours || DEFAULT_SHORT_PASS_DURATION_HOURS,
              graceMinutes: pass.graceMinutes || DEFAULT_SHORT_PASS_GRACE_MINUTES,
            })
          : null;
      lateReturnMinutes =
        pass.passType === "LongLeave"
          ? Math.max(0, minutesBetween(pass.timeIn, now))
          : shortPassReturn?.status === "Late"
            ? shortPassReturn.lateDurationMinutes
            : 0;

      query = {
        _id: pass._id,
        $and: [
          isUnscannedInQuery(),
          { $or: [{ status: "Out" }, { scannedOutAt: { $exists: true, $ne: null } }] },
        ],
      };
      update = {
        $set: {
          status: "Returned",
          scannedInAt: now,
          scannedInBy: sessionUser.id,
          shortPassStatus: shortPassReturn?.status,
          expectedReturnTime: shortPassReturn?.expectedReturnTime || (pass.passType === "LongLeave" ? pass.timeIn : undefined),
          totalDurationMinutes:
            shortPassReturn?.totalDurationMinutes ?? (pass.passType === "LongLeave" ? minutesBetween(pass.timeOut, now) : undefined),
          lateDurationMinutes: lateReturnMinutes || shortPassReturn?.lateDurationMinutes,
        },
        $unset: {
          qrTokenHash: "",
          qrTokenExpiresAt: "",
        },
      };
      message =
        lateReturnMinutes > 0
          ? `Student Scanned IN (Returned Late by ${lateReturnMinutes} minutes)`
          : "Student Scanned IN (Returned)";
    } else if (pass.status === "Returned" || pass.scannedInAt) {
      return NextResponse.json({ message: "Pass has already been used for return" }, { status: 400 });
    } else if (pass.status === "Expired") {
      return NextResponse.json({ message: "Pass is expired" }, { status: 400 });
    } else {
      return NextResponse.json({ message: "Pass cannot be scanned in its current state" }, { status: 400 });
    }

    const updatedPass = await Pass.findOneAndUpdate(query, update, { new: true });

    if (!updatedPass) {
      return NextResponse.json({ message: "Pass scan state changed. Please scan again." }, { status: 409 });
    }

    if (lateReturnMinutes > 0) {
      await Notification.create({
        user: pass.user,
        pass: pass._id,
        title: "Warning: Late return",
        message: `You returned ${lateReturnMinutes} minutes late for your pass to ${pass.place}. Please return within the approved gate-pass time.`,
        type: "warning",
      });
    }

    return NextResponse.json({ message, pass: updatedPass }, { status: 200 });
  } catch (error: unknown) {
    console.error("Scan pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
