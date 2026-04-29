import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Pass from "@/models/Pass";

const PASS_STATUSES = ["Active", "Expired", "Pending"] as const;

function parseTimeToday(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function derivePassStatus(timeOut: Date, timeIn: Date, now = new Date()) {
  if (timeIn <= now) {
    return "Expired" as const;
  }

  if (timeOut > now) {
    return "Pending" as const;
  }

  return "Active" as const;
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any).id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const phone = body.phone?.replace(/\D/g, "");
    const place = body.place?.trim();
    const purpose = body.purpose?.trim();
    const person = body.person?.trim() || undefined;
    const personPhone = body.personPhone?.replace(/\D/g, "") || undefined;
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

    const timeOutDate = parseTimeToday(timeOut);
    const timeInDate = parseTimeToday(timeIn);

    if (!timeOutDate || !timeInDate) {
      return NextResponse.json({ message: "Invalid time format" }, { status: 400 });
    }

    if (timeInDate <= timeOutDate) {
      return NextResponse.json({ message: "Time In must be after Time Out" }, { status: 400 });
    }

    await dbConnect();

    const newPass = await Pass.create({
      user: (session.user as any).id,
      phone,
      place,
      purpose,
      timeOut: timeOutDate,
      timeIn: timeInDate,
      person,
      personPhone,
      status: derivePassStatus(timeOutDate, timeInDate),
    });

    return NextResponse.json({ pass: newPass }, { status: 201 });
  } catch (error: any) {
    console.error("Create pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any).id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    await Pass.updateMany(
      {
        user: (session.user as any).id,
        status: { $ne: "Expired" },
        timeIn: { $lte: now },
      },
      { $set: { status: "Expired" } }
    );

    const passes = await Pass.find({ user: (session.user as any).id })
      .sort({ createdAt: -1 })
      .lean();

    const formattedPasses = passes.map((pass: any) => ({
        ...pass,
        timeOut: pass.timeOut instanceof Date
          ? formatTime(pass.timeOut)
          : pass.timeOut,
        timeIn: pass.timeIn instanceof Date
          ? formatTime(pass.timeIn)
          : pass.timeIn,
        status: pass.timeOut instanceof Date && pass.timeIn instanceof Date
          ? derivePassStatus(pass.timeOut, pass.timeIn, now)
          : pass.status,
      }));

    return NextResponse.json({ passes: formattedPasses }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch passes error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any).id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { passId, status } = body;

    if (!passId || !status) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!PASS_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    await dbConnect();

    const pass = await Pass.findOneAndUpdate(
      { _id: passId, user: (session.user as any).id },
      { status },
      { new: true }
    );

    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    return NextResponse.json({ pass }, { status: 200 });
  } catch (error: any) {
    console.error("Update pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
