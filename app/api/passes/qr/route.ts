import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { createQrToken } from "@/lib/qrToken";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { DEFAULT_SHORT_PASS_DURATION_HOURS, addHours } from "@/lib/shortPassLogic";
import Pass from "@/models/Pass";

type SessionUser = {
  id?: string;
};

function getSessionUser(session: { user?: unknown } | null) {
  return session?.user as SessionUser | undefined;
}

function isApprovedForQr(pass: {
  approvalStatus?: string;
  passType?: string;
  hodApprovalStatus?: string;
  wardenApprovalStatus?: string;
}) {
  return (
    pass.approvalStatus === "Approved" &&
    (pass.passType !== "LongLeave" ||
      (pass.hodApprovalStatus === "Approved" && pass.wardenApprovalStatus === "Approved"))
  );
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (!sessionUser?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(`qr:${sessionUser.id}:${getClientIp(req)}`, 20, 60000);

    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many QR requests" }, { status: 429 });
    }

    const { passId } = (await req.json()) as { passId?: string };

    if (!passId || !mongoose.Types.ObjectId.isValid(passId)) {
      return NextResponse.json({ message: "Invalid pass" }, { status: 400 });
    }

    await dbConnect();

    const now = new Date();
    const pass = await Pass.findOne({ _id: passId, user: sessionUser.id });

    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    if (!isApprovedForQr(pass)) {
      return NextResponse.json({ message: "Pass is not approved for QR yet" }, { status: 400 });
    }

    if (pass.passType !== "LongLeave" && !pass.scannedOutAt && now > addHours(pass.timeOut, pass.allowedDurationHours || DEFAULT_SHORT_PASS_DURATION_HOURS)) {
      return NextResponse.json({ message: "Pass is overdue" }, { status: 400 });
    }

    if (
      pass.status === "Returned" ||
      pass.status === "Expired" ||
      pass.scannedInAt ||
      (pass.passType === "LongLeave" && pass.timeIn <= now)
    ) {
      return NextResponse.json({ message: "Pass is no longer valid" }, { status: 400 });
    }

    const token = createQrToken(String(pass._id), String(pass.user), 5 * 60);

    pass.qrTokenHash = token.jtiHash;
    pass.qrTokenExpiresAt = token.expiresAt;
    await pass.save();

    return NextResponse.json(
      {
        qrData: token.qrData,
        expiresAt: token.expiresAt.toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Issue QR token error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
