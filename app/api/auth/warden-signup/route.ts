import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "../[...nextauth]/route";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  readJson,
  validatePassword,
} from "@/lib/security";

function validateInput(name: string, email: string, phone: string, hostel: string, password: unknown) {
  if (!name || !email || !phone || !hostel || !password) return "All fields are required";
  if (name.length < 3) return "Name must be at least 3 characters";
  if (!isValidEmail(email)) return "Enter a valid email address";
  if (!isValidPhone(phone)) return "Enter a valid 10-digit phone number";
  if (hostel.length > 50) return "Hostel is too long";
  return validatePassword(password);
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`warden-signup:${getClientIp(req)}`, 5, 60000);
    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many signup attempts" }, { status: 429 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { password } = body as { password?: string };
    const normalizedName = normalizeText((body as { name?: unknown }).name, 80);
    const normalizedEmail = normalizeEmail((body as { email?: unknown }).email);
    const normalizedPhone = normalizePhone((body as { phone?: unknown }).phone);
    const normalizedHostel = normalizeText((body as { hostel?: unknown }).hostel, 50);

    const validationError = validateInput(normalizedName, normalizedEmail, normalizedPhone, normalizedHostel, password);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    await dbConnect();

    const existingWarden = await User.exists({ role: "warden" });

    if (existingWarden) {
      const session = await getServerSession(authOptions);
      const currentUserId = (session?.user as { id?: string } | undefined)?.id;
      const currentUser = currentUserId ? await User.findById(currentUserId).select("role") : null;

      if (!currentUser || !["admin", "warden"].includes(currentUser.role)) {
        return NextResponse.json(
          { message: "Only an admin or existing warden can create another warden account" },
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
      existingUser.hostel = normalizedHostel;
      existingUser.password = hashedPassword;
      existingUser.role = "warden";
      await existingUser.save();
    } else {
      await User.create({
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        hostel: normalizedHostel,
        password: hashedPassword,
        role: "warden",
      });
    }

    return NextResponse.json({ message: "Warden account created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Warden signup error:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Something went wrong" }, { status: 500 });
  }
}
