import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Pass from "@/models/Pass";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/security";

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
  [key: string]: unknown;
};

function hasScanOutWithoutReturn(pass: LeanPass) {
  return Boolean(pass.scannedOutAt && !pass.scannedInAt);
}

function getSessionUser(session: { user?: unknown } | null) {
  const user = session?.user as Partial<SessionUser> | undefined;
  return user?.id ? { id: user.id } : null;
}

function parseTimeToday(value: string) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return parseDateTime(`${year}-${month}-${day}`, value);
}

function parseDateTime(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
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
    const leaveStartDate = body.leaveStartDate;
    const leaveEndDate = body.leaveEndDate;
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

    let timeOutDate: Date | null = null;
    let timeInDate: Date | null = null;
    let leaveStartDateValue: Date | undefined;
    let leaveEndDateValue: Date | undefined;

    if (passType === "LongLeave") {
      if (!leaveStartDate || !leaveEndDate) {
        return NextResponse.json({ message: "Select leave start and end dates" }, { status: 400 });
      }

      const leaveDays = inclusiveLeaveDays(leaveStartDate, leaveEndDate);
      if (leaveDays < 2 || leaveDays > 15) {
        return NextResponse.json({ message: "Long leave must be between 2 and 15 days" }, { status: 400 });
      }

      timeOutDate = parseDateTime(leaveStartDate, timeOut);
      timeInDate = parseDateTime(leaveEndDate, timeIn);
      leaveStartDateValue = new Date(`${leaveStartDate}T00:00:00`);
      leaveEndDateValue = new Date(`${leaveEndDate}T00:00:00`);
    } else {
      timeOutDate = parseTimeToday(timeOut);
      timeInDate = parseTimeToday(timeIn);
    }

    if (!timeOutDate || !timeInDate) {
      return NextResponse.json({ message: "Invalid date or time format" }, { status: 400 });
    }

    if (timeInDate <= timeOutDate) {
      return NextResponse.json({ message: "Time In must be after Time Out" }, { status: 400 });
    }

    if (timeInDate <= new Date()) {
      return NextResponse.json({ message: "Return time must be in the future" }, { status: 400 });
    }

    await dbConnect();

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
        status: { $nin: ["Out", "Expired", "Returned"] },
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
        status: { $nin: ["Expired", "Returned"] },
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
        status: pass.timeOut instanceof Date && pass.timeIn instanceof Date
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

