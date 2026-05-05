import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Pass from "@/models/Pass";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { isObjectId, readJson } from "@/lib/security";
import {
  DEFAULT_SHORT_PASS_DURATION_HOURS,
  DEFAULT_SHORT_PASS_GRACE_MINUTES,
  evaluateShortPass,
  isInvalidRequestedShortPass,
  minutesBetween,
} from "@/lib/shortPassLogic";

type SessionUser = {
  id: string;
};

type PassBody = {
  phone?: string;
  place?: string;
  purpose?: string;
  person?: string;
  personPhone?: string;
  passType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  timeOut?: string;
  timeIn?: string;
};

type LeanPass = {
  timeOut?: Date | string;
  timeIn?: Date | string;
  status?: string;
  approvalStatus?: string;
  hodApprovalStatus?: string;
  wardenApprovalStatus?: string;
  scannedOutAt?: Date;
  scannedInAt?: Date;
  leaveStartDate?: Date | string;
  leaveEndDate?: Date | string;
  passType?: string;
  shortPassStatus?: string;
  allowedDurationHours?: number;
  graceMinutes?: number;
  expectedReturnTime?: Date | string;
  totalDurationMinutes?: number | null;
  lateDurationMinutes?: number | null;
  [key: string]: unknown;
};

function hasScanOutWithoutReturn(pass: LeanPass) {
  return Boolean(pass.scannedOutAt && !pass.scannedInAt);
}

function getSessionUser(session: { user?: unknown } | null) {
  const user = session?.user as Partial<SessionUser> | undefined;
  return user?.id ? { id: user.id } : null;
}

function parseDateTime(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function inclusiveLeaveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function derivePassStatus(
  timeOut: Date,
  timeIn: Date,
  now = new Date(),
  currentStatus?: string,
  scannedOutAt?: Date,
  scannedInAt?: Date
) {
  if (scannedInAt || currentStatus === "Returned") {
    return "Returned" as const;
  }

  if (scannedOutAt || currentStatus === "Out") {
    if (timeIn <= now) {
      return "Expired" as const;
    }

    return "Out" as const;
  }

  // If pass is already manually scanned, keep the state unless it's expired by timeIn
  if (currentStatus === "Expired") {
    return currentStatus;
  }

  if (timeIn <= now) {
    return "Expired" as const;
  }

  if (timeOut > now) {
    return "Pending" as const;
  }

  return "Active" as const;
}

function getShortPassDetails(pass: LeanPass, now = new Date()) {
  if (pass.passType === "LongLeave" || pass.status === "Cancelled" || !(pass.timeOut instanceof Date)) {
    return {};
  }

  const result = evaluateShortPass({
    outTime: pass.timeOut,
    inTime: pass.scannedInAt || null,
    allowedDurationHours: pass.allowedDurationHours || DEFAULT_SHORT_PASS_DURATION_HOURS,
    graceMinutes: pass.graceMinutes || DEFAULT_SHORT_PASS_GRACE_MINUTES,
    currentTime: now,
  });

  return {
    shortPassStatus: result.status,
    expectedReturnTime: result.expectedReturnTime.toISOString(),
    totalDurationMinutes: result.totalDurationMinutes,
    lateDurationMinutes: result.lateDurationMinutes,
  };
}

function hasPendingApproval(pass: {
  passType?: string;
  approvalStatus?: string;
  hodApprovalStatus?: string;
  wardenApprovalStatus?: string;
}) {
  return (
    pass.approvalStatus === "Pending" ||
    (pass.passType === "LongLeave" &&
      (pass.hodApprovalStatus === "Pending" || pass.wardenApprovalStatus === "Pending"))
  );
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(`create-pass:${sessionUser.id}:${getClientIp(req)}`, 12, 60000);
    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many pass requests" }, { status: 429 });
    }

    const body = (await readJson(req)) as PassBody | null;
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const phone = body.phone?.replace(/\D/g, "");
    const place = body.place?.trim();
    const purpose = body.purpose?.trim();
    const person = body.person?.trim() || undefined;
    const personPhone = body.personPhone?.replace(/\D/g, "") || undefined;
    const passType = body.passType === "LongLeave" ? "LongLeave" : "Short";
    const passDate = formatDateInput(new Date());
    const leaveStartDate = passType === "Short" ? body.leaveStartDate || passDate : body.leaveStartDate;
    const leaveEndDate = passType === "Short" ? body.leaveEndDate || leaveStartDate : body.leaveEndDate;
    const timeOut = body.timeOut;
    const timeIn = body.timeIn;

    if (!phone || !place || !purpose || !timeOut || !timeIn) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ message: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    if (personPhone && !/^[6-9]\d{9}$/.test(personPhone)) {
      return NextResponse.json({ message: "Enter a valid accompanying phone number" }, { status: 400 });
    }

    if (place.length > 120 || purpose.length > 240 || (person && person.length > 80)) {
      return NextResponse.json({ message: "Pass details are too long" }, { status: 400 });
    }

    if (!leaveStartDate || !leaveEndDate) {
      return NextResponse.json({ message: "Select leave start and end dates" }, { status: 400 });
    }

    const leaveDays = inclusiveLeaveDays(leaveStartDate, leaveEndDate);
    if (leaveDays < 1) {
      return NextResponse.json({ message: "Return date must be after or same as leave date" }, { status: 400 });
    }

    if (passType === "LongLeave") {
      const todayStart = new Date(`${passDate}T00:00:00`);
      const requestedStart = new Date(`${leaveStartDate}T00:00:00`);

      if (requestedStart < todayStart) {
        return NextResponse.json({ message: "Leave start date cannot be in the past" }, { status: 400 });
      }

      if (leaveDays < 2 || leaveDays > 15) {
        return NextResponse.json({ message: "Long leave must be between 2 and 15 days" }, { status: 400 });
      }
    }

    const timeOutDate = parseDateTime(leaveStartDate, timeOut);
    let timeInDate = parseDateTime(leaveEndDate, timeIn);
    const leaveStartDateValue = new Date(`${leaveStartDate}T00:00:00`);

    if (!timeOutDate || !timeInDate) {
      return NextResponse.json({ message: "Invalid date or time format" }, { status: 400 });
    }

    if (passType === "Short" && timeInDate <= timeOutDate) {
      timeInDate = addDays(timeInDate, 1);
    }

    const leaveEndDateValue = new Date(`${formatDateInput(timeInDate)}T00:00:00`);

    if (timeInDate <= timeOutDate) {
      return NextResponse.json({ message: "Time In must be after Time Out" }, { status: 400 });
    }

    if (passType === "Short" && isInvalidRequestedShortPass(timeOutDate, timeInDate)) {
      const invalidShortPass = evaluateShortPass({
        outTime: timeOutDate,
        inTime: timeInDate,
      });

      return NextResponse.json(
        {
          message: "Invalid Short Pass",
          status: "Invalid Short Pass",
          totalDurationMinutes: invalidShortPass.totalDurationMinutes,
          expectedReturnTime: invalidShortPass.expectedReturnTime.toISOString(),
        },
        { status: 400 }
      );
    }

    if (passType === "LongLeave" && timeInDate <= new Date()) {
      return NextResponse.json({ message: "Return time must be in the future" }, { status: 400 });
    }

    await dbConnect();

    await Pass.updateMany(
      {
        user: sessionUser.id,
        scannedOutAt: { $exists: false },
        scannedInAt: { $exists: false },
        status: { $nin: ["Expired", "Returned", "Cancelled"] },
        timeIn: { $lte: new Date() },
      },
      { $set: { status: "Expired" } }
    );

    const openPass = await Pass.findOne({
      user: sessionUser.id,
      status: { $nin: ["Returned", "Expired", "Cancelled"] },
      approvalStatus: { $ne: "Rejected" },
      hodApprovalStatus: { $ne: "Rejected" },
      wardenApprovalStatus: { $ne: "Rejected" },
    })
      .select("_id passType status approvalStatus hodApprovalStatus wardenApprovalStatus")
      .lean();

    if (openPass) {
      return NextResponse.json(
        {
          message:
            "You already have an active gate pass request. Complete or cancel it before creating another pass.",
        },
        { status: 409 }
      );
    }

    const shortPassDetails =
      passType === "Short"
        ? evaluateShortPass({
            outTime: timeOutDate,
            currentTime: new Date(),
          })
        : null;

    const newPass = await Pass.create({
      user: sessionUser.id,
      phone,
      place,
      purpose,
      passType,
      leaveStartDate: leaveStartDateValue,
      leaveEndDate: leaveEndDateValue,
      timeOut: timeOutDate,
      timeIn: timeInDate,
      person,
      personPhone,
      status: derivePassStatus(timeOutDate, timeInDate),
      shortPassStatus: shortPassDetails?.status,
      allowedDurationHours: passType === "Short" ? DEFAULT_SHORT_PASS_DURATION_HOURS : undefined,
      graceMinutes: passType === "Short" ? DEFAULT_SHORT_PASS_GRACE_MINUTES : undefined,
      expectedReturnTime: shortPassDetails?.expectedReturnTime,
      totalDurationMinutes: passType === "Short" ? minutesBetween(timeOutDate, timeInDate) : undefined,
      lateDurationMinutes: shortPassDetails?.lateDurationMinutes,
      approvalStatus: "Pending",
      hodApprovalStatus: passType === "LongLeave" ? "Pending" : "NotRequired",
      wardenApprovalStatus: passType === "LongLeave" ? "Pending" : "NotRequired",
    });

    return NextResponse.json({ pass: newPass }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    await Pass.updateMany(
      {
        user: sessionUser.id,
        scannedOutAt: { $exists: true, $ne: null },
        $or: [{ scannedInAt: { $exists: false } }, { scannedInAt: null }],
        status: { $nin: ["Out", "Expired", "Returned", "Cancelled"] },
      },
      { $set: { status: "Out" } }
    );

    await Pass.updateMany(
      {
        user: sessionUser.id,
        scannedInAt: { $exists: true, $ne: null },
        status: { $ne: "Returned" },
      },
      { $set: { status: "Returned" } }
    );

    await Pass.updateMany(
      {
        user: sessionUser.id,
        passType: "LongLeave",
        status: { $nin: ["Expired", "Returned", "Cancelled"] },
        timeIn: { $lte: now },
      },
      { $set: { status: "Expired" } }
    );

    const passes = await Pass.find({ user: sessionUser.id })
      .sort({ createdAt: -1 })
      .lean();

    const formattedPasses = (passes as LeanPass[]).map((pass) => ({
        ...pass,
        timeOut: pass.timeOut instanceof Date
          ? formatTime(pass.timeOut)
          : pass.timeOut,
        timeIn: pass.timeIn instanceof Date
          ? formatTime(pass.timeIn)
          : pass.timeIn,
        status: pass.status === "Cancelled"
          ? "Cancelled"
          : pass.passType !== "LongLeave" && pass.timeOut instanceof Date
          ? pass.scannedInAt
            ? "Returned"
            : hasScanOutWithoutReturn(pass)
              ? "Out"
              : pass.timeOut > now
                ? "Pending"
                : "Active"
          : pass.timeOut instanceof Date && pass.timeIn instanceof Date
            ? derivePassStatus(
                pass.timeOut,
                pass.timeIn,
                now,
                pass.status,
                pass.scannedOutAt,
                pass.scannedInAt
              )
            : hasScanOutWithoutReturn(pass)
              ? "Out"
              : pass.scannedInAt
                ? "Returned"
                : pass.status,
        ...getShortPassDetails(pass, now),
        approvalStatus: pass.approvalStatus || "Approved",
        hodApprovalStatus: pass.hodApprovalStatus || "NotRequired",
        wardenApprovalStatus: pass.wardenApprovalStatus || (pass.passType === "LongLeave" ? pass.approvalStatus || "Pending" : "NotRequired"),
        leaveStartDate: pass.leaveStartDate instanceof Date
          ? pass.leaveStartDate.toISOString()
          : pass.leaveStartDate,
        leaveEndDate: pass.leaveEndDate instanceof Date
          ? pass.leaveEndDate.toISOString()
          : pass.leaveEndDate,
      }));

    return NextResponse.json(
      { passes: formattedPasses },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Fetch passes error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await readJson(req)) as { passId?: unknown } | null;

    if (!body || !isObjectId(body.passId)) {
      return NextResponse.json({ message: "Invalid pass" }, { status: 400 });
    }

    await dbConnect();

    const pass = await Pass.findOne({ _id: body.passId, user: sessionUser.id });

    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    if (pass.status === "Cancelled") {
      return NextResponse.json({ message: "Pass is already cancelled" }, { status: 400 });
    }

    if (pass.scannedOutAt || pass.status === "Out") {
      return NextResponse.json({ message: "Pass cannot be cancelled after scan out" }, { status: 400 });
    }

    const canCancelExpiredPendingPass = pass.status === "Expired" && hasPendingApproval(pass);

    if (pass.scannedInAt || pass.status === "Returned" || (pass.status === "Expired" && !canCancelExpiredPendingPass)) {
      return NextResponse.json({ message: "Completed or expired passes cannot be cancelled" }, { status: 400 });
    }

    pass.status = "Cancelled";
    pass.approvalStatus = "Rejected";
    pass.hodApprovalStatus = pass.passType === "LongLeave" ? "Rejected" : pass.hodApprovalStatus;
    pass.wardenApprovalStatus = pass.passType === "LongLeave" ? "Rejected" : pass.wardenApprovalStatus;
    pass.qrTokenHash = undefined;
    pass.qrTokenExpiresAt = undefined;
    await pass.save();

    return NextResponse.json({ message: "Pass cancelled successfully", pass }, { status: 200 });
  } catch (error: unknown) {
    console.error("Cancel pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

