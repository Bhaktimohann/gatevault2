import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { readJson, validatePassword } from "@/lib/security";

type SessionUser = {
  id: string;
};

function getSessionUser(session: { user?: unknown } | null) {
  const user = session?.user as Partial<SessionUser> | undefined;
  return user?.id ? { id: user.id } : null;
}

export async function PUT(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { oldPhone, newPhone } = body as { oldPhone?: string; newPhone?: string };
    const normalizedOldPhone = oldPhone?.replace(/\D/g, "");
    const normalizedNewPhone = newPhone?.replace(/\D/g, "");

    if (!normalizedOldPhone || !normalizedNewPhone) {
      return NextResponse.json({ message: "Please fill both phone fields" }, { status: 400 });
    }

    if (!/^[6-9]\d{9}$/.test(normalizedOldPhone) || !/^[6-9]\d{9}$/.test(normalizedNewPhone)) {
      return NextResponse.json({ message: "Phone number must be a valid 10-digit Indian number" }, { status: 400 });
    }

    if (normalizedOldPhone === normalizedNewPhone) {
      return NextResponse.json({ message: "New phone must be different" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(sessionUser.id);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if ((user.phone || "") !== normalizedOldPhone) {
      return NextResponse.json({ message: "Old phone number does not match your profile" }, { status: 400 });
    }

    user.phone = normalizedNewPhone;
    await user.save();

    return NextResponse.json(
      {
        message: "Phone updated successfully",
        user: {
          phone: user.phone,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update settings phone error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
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

    const limit = rateLimit(`password-change:${sessionUser.id}:${getClientIp(req)}`, 5, 60000);
    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many password attempts" }, { status: 429 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { oldPassword, newPassword, confirmPassword } = body as {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: "Please fill all password fields" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(sessionUser.id).select("+password");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ message: "Password login is not enabled for this account" }, { status: 400 });
    }

    const isCorrectPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isCorrectPassword) {
      return NextResponse.json({ message: "Old password is incorrect" }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: "Password changed successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Update settings password error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
