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
    const { qrData } = body;

    if (!qrData || !qrData.startsWith("gatepass-")) {
      return NextResponse.json({ message: "Invalid QR code" }, { status: 400 });
    }

    const passId = qrData.replace("gatepass-", "");

    await dbConnect();

    const pass = await Pass.findById(passId);

    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    // Now update the status
    let newStatus = pass.status;
    let message = "";

    const now = new Date();

    // Check if the pass is expired based on time
    if (pass.timeIn <= now && pass.status !== "Returned") {
      pass.status = "Expired";
      await pass.save();
      return NextResponse.json({ message: "This pass has expired" }, { status: 400 });
    }

    if (pass.status === "Active" || pass.status === "Pending") {
      newStatus = "Out";
      message = "Student Scanned OUT";
    } else if (pass.status === "Out") {
      newStatus = "Returned";
      message = "Student Scanned IN (Returned)";
    } else if (pass.status === "Returned") {
      return NextResponse.json({ message: "Pass has already been used for return" }, { status: 400 });
    } else if (pass.status === "Expired") {
      return NextResponse.json({ message: "Pass is expired" }, { status: 400 });
    }

    pass.status = newStatus;
    await pass.save();

    return NextResponse.json({ message, pass }, { status: 200 });
  } catch (error: any) {
    console.error("Scan pass error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
