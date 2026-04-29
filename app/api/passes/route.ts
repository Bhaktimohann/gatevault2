import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Pass from "@/models/Pass";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any).id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone, place, purpose, timeOut, timeIn, person, personPhone } = body;

    if (!phone || !place || !purpose || !timeOut || !timeIn) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const now = new Date();
    const timeOutDate = new Date(now.toDateString() + " " + timeOut);
    const timeInDate = new Date(now.toDateString() + " " + timeIn);

    const newPass = await Pass.create({
      user: (session.user as any).id,
      phone,
      place,
      purpose,
      timeOut: timeOutDate,
      timeIn: timeInDate,
      person,
      personPhone,
      status: "Active",
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

    const passes = await Pass.find({ user: (session.user as any).id })
      .sort({ createdAt: -1 })
      .lean();

    const formattedPasses = passes.map((pass: any) => ({
        ...pass,
        timeOut: pass.timeOut instanceof Date 
          ? pass.timeOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          : pass.timeOut,
        timeIn: pass.timeIn instanceof Date 
          ? pass.timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          : pass.timeIn,
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

    if (!["Active", "Expired", "Pending"].includes(status)) {
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
