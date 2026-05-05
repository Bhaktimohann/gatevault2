import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const ROLES = ["student", "admin", "hod", "warden", "security"] as const;
export type Role = (typeof ROLES)[number];

type AuthenticatedUser = {
  _id: mongoose.Types.ObjectId;
  id: string;
  email: string;
  role: Role;
  hostel?: string;
};

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export function normalizePhone(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function envList(name: string) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isPrivilegedRole(role?: string) {
  return role === "admin" || role === "hod" || role === "warden" || role === "security";
}

export function isEmailAllowedForSignup(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split("@")[1] || "";
  const allowedDomains = [...envList("COLLEGE_EMAIL_DOMAINS"), ...envList("ALLOWED_EMAIL_DOMAINS")];
  const allowedEmails = [
    ...envList("ALLOWED_SIGNUP_EMAILS"),
    ...envList("ALLOWED_STUDENT_EMAILS"),
    ...envList("ADMIN_EMAILS"),
  ];

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return false;
  }

  return allowedEmails.includes(normalizedEmail) || allowedDomains.includes(domain);
}

export function isValidPhone(value: string) {
  return /^[6-9]\d{9}$/.test(value);
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string") {
    return "Password is required";
  }

  if (value.length < 10) {
    return "Password must be at least 10 characters";
  }

  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    return "Password must include uppercase, lowercase, and a number";
  }

  return null;
}

export function validateStaffSignupCode(value: unknown, role: Role) {
  const providedCode = typeof value === "string" ? value.trim() : "";
  const roleCode = process.env[`${role.toUpperCase()}_SIGNUP_CODE`]?.trim();
  const sharedCode = process.env.STAFF_SIGNUP_CODE?.trim();
  const expectedCode = roleCode || sharedCode;

  if (!expectedCode) {
    return "Staff signup is not configured";
  }

  if (!providedCode || providedCode !== expectedCode) {
    return "Invalid staff verification code";
  }

  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function requireUser(allowedRoles?: Role[]) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { error: jsonError("Unauthorized", 401) };
  }

  await dbConnect();

  const user = (await User.findById(userId).select("email role hostel")) as AuthenticatedUser | null;

  if (!user) {
    return { error: jsonError("Unauthorized", 401) };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: jsonError("Forbidden", 403) };
  }

  return {
    user: {
      _id: user._id,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      hostel: user.hostel,
    },
  };
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
