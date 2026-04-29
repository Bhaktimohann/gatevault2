import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, phone, password } = await req.json();
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.replace(/\D/g, "");

    if (!normalizedName || !normalizedEmail || !normalizedPhone || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (normalizedName.length < 3) {
      return NextResponse.json({ message: "Name must be at least 3 characters" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json({ message: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json({ message: "User already exists with this email" }, { status: 400 });
      }

      existingUser.name = normalizedName;
      existingUser.phone = normalizedPhone;
      existingUser.password = await bcrypt.hash(password, 10);
      await existingUser.save();

      return NextResponse.json({ message: "Account completed successfully" }, { status: 200 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
    });

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ message: error.message || "Something went wrong" }, { status: 500 });
  }
}
