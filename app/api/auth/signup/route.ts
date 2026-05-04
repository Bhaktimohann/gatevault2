import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { isEmailAllowedForSignup, readJson, validatePassword } from "@/lib/security";

function getRoleForEmail(email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email) ? "admin" : "student";
}

async function getRoleForExistingUser(user: { role?: string }, email: string) {
  if (getRoleForEmail(email) === "admin" || user.role === "admin") {
    return "admin";
  }

  return "student";
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`signup:${getClientIp(req)}`, 10, 60000);
    if (!limit.allowed) {
      return NextResponse.json({ message: "Too many signup attempts" }, { status: 429 });
    }

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { name, email, phone, password, universityId, semester, department, branch } = body as Record<string, string>;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.replace(/\D/g, "");
    const normalizedUniversityId = universityId?.trim();
    const normalizedSemester = semester?.trim();
    const normalizedDepartment = department?.trim();
    const normalizedBranch = branch?.trim();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedPhone ||
      !password ||
      !normalizedUniversityId ||
      !normalizedSemester ||
      !normalizedDepartment ||
      !normalizedBranch
    ) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (normalizedName.length < 3) {
      return NextResponse.json({ message: "Name must be at least 3 characters" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 });
    }

    if (!isEmailAllowedForSignup(normalizedEmail)) {
      return NextResponse.json(
        { message: "Use your verified college email or contact admin for access" },
        { status: 403 }
      );
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json({ message: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    if (normalizedUniversityId.length > 40) {
      return NextResponse.json({ message: "University ID is too long" }, { status: 400 });
    }

    if (normalizedSemester.length > 20) {
      return NextResponse.json({ message: "Semester is too long" }, { status: 400 });
    }

    if (normalizedDepartment.length > 80) {
      return NextResponse.json({ message: "Department is too long" }, { status: 400 });
    }

    if (normalizedBranch.length > 80) {
      return NextResponse.json({ message: "Branch is too long" }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json({ message: "User already exists with this email" }, { status: 400 });
      }

      existingUser.name = normalizedName;
      existingUser.phone = normalizedPhone;
      existingUser.universityId = normalizedUniversityId;
      existingUser.semester = normalizedSemester;
      existingUser.department = normalizedDepartment;
      existingUser.branch = normalizedBranch;
      existingUser.password = await bcrypt.hash(password, 12);
      existingUser.role = await getRoleForExistingUser(existingUser, normalizedEmail);
      await existingUser.save();

      return NextResponse.json({ message: "Account completed successfully" }, { status: 200 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      universityId: normalizedUniversityId,
      semester: normalizedSemester,
      department: normalizedDepartment,
      branch: normalizedBranch,
      password: hashedPassword,
      role: getRoleForEmail(normalizedEmail),
    });

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Signup error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ message }, { status: 500 });
  }
}
