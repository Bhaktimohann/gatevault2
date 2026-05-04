import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isSameOriginRequest } from "@/lib/requestSecurity";
import { readJson } from "@/lib/security";

const AVATAR_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

type SessionUser = {
  id: string;
};

function getSessionUser(session: { user?: unknown } | null) {
  const user = session?.user as Partial<SessionUser> | undefined;
  return user?.id ? { id: user.id } : null;
}

function hasValidImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(sessionUser.id)
      .select("name email phone universityId semester department branch section hostel room avatar role")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    console.error("Fetch user profile error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
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

    const phone = body.phone?.trim() || "";
    const universityId = body.universityId?.trim() || "";
    const semester = body.semester?.trim() || "";
    const department = body.department?.trim() || "";
    const branch = body.branch?.trim() || "";
    const section = body.section?.trim() || "";
    const hostel = body.hostel?.trim() || "";
    const room = body.room?.trim() || "";

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ message: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    if (universityId && universityId.length > 40) {
      return NextResponse.json({ message: "University ID is too long" }, { status: 400 });
    }

    if (semester && semester.length > 20) {
      return NextResponse.json({ message: "Semester is too long" }, { status: 400 });
    }

    if (department && department.length > 80) {
      return NextResponse.json({ message: "Department is too long" }, { status: 400 });
    }

    if (branch && branch.length > 80) {
      return NextResponse.json({ message: "Branch is too long" }, { status: 400 });
    }

    if (section && section.length > 20) {
      return NextResponse.json({ message: "Section is too long" }, { status: 400 });
    }

    if (hostel && hostel.length > 50) {
      return NextResponse.json({ message: "Hostel is too long" }, { status: 400 });
    }

    if (room && room.length > 20) {
      return NextResponse.json({ message: "Room is too long" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(
      sessionUser.id,
      {
        phone,
        universityId,
        semester,
        department,
        branch,
        section,
        hostel,
        room,
      },
      {
        new: true,
      }
    )
      .select("name email phone universityId semester department branch section hostel room avatar role")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user, message: "Profile updated successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Update user profile error:", error);
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

    const formData = await req.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Avatar file is required" }, { status: 400 });
    }

    if (!AVATAR_EXTENSION_BY_TYPE[file.type]) {
      return NextResponse.json({ message: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 150 * 1024) {
      return NextResponse.json({ message: "Image too large! Max 150KB allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!hasValidImageSignature(buffer, file.type)) {
      return NextResponse.json({ message: "Invalid image file" }, { status: 400 });
    }

    const extension = AVATAR_EXTENSION_BY_TYPE[file.type];
    const fileName = `avatar-${sessionUser.id}-${Date.now()}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    await dbConnect();

    const avatarPath = `/uploads/avatars/${fileName}`;
    const user = await User.findByIdAndUpdate(
      sessionUser.id,
      { avatar: avatarPath },
      { new: true }
    )
      .select("name email phone universityId semester department branch section hostel room avatar role")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user, message: "Profile photo updated successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Update avatar error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
