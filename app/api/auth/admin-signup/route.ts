import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "../[...nextauth]/route";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { isValidEmail, isValidPhone, readJson, validatePassword } from "@/lib/security";

function validateInput(name: string, email: string, phone: string, password: unknown) {
  if (!name || !email || !phone || !password) {
    return "All fields are required";
  }

  if (name.length < 3) {
    return "Name must be at least 3 characters";
  }

  if (!isValidEmail(email)) {
    return "Enter a valid email address";
  }

  if (!isValidPhone(phone)) {
    return "Enter a valid 10-digit phone number";
  }

  return validatePassword(password);
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`admin-signup:${getClientIp(req)}`, 5, 60000);
    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many signup attempts" }, { status: 429 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { name, email, phone, password } = body as Record<string, string>;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.replace(/\D/g, "");

    const validationError = validateInput(normalizedName, normalizedEmail, normalizedPhone, password);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    await dbConnect();

    const existingAdmin = await User.exists({ role: "admin" });

    if (existingAdmin) {
      const session = await getServerSession(authOptions);
      const currentUserId = (session?.user as { id?: string } | undefined)?.id;
      const currentUser = currentUserId ? await User.findById(currentUserId) : null;

      if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json(
          { message: "Only an existing admin can create another admin account" },
          { status: 403 }
        );
      }
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser?.password) {
      return NextResponse.json({ message: "User already exists with this email" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    if (existingUser) {
      existingUser.name = normalizedName;
      existingUser.phone = normalizedPhone;
      existingUser.password = hashedPassword;
      existingUser.role = "admin";
      await existingUser.save();
    } else {
      await User.create({
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        role: "admin",
      });
    }

    return NextResponse.json({ message: "Admin account created successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Admin signup error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
