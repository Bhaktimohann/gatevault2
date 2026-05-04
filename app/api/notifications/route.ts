import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { isSameOriginRequest } from "@/lib/requestSecurity";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    return NextResponse.json(
      { notifications, unreadCount },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });

    return NextResponse.json({ message: "Notifications marked as read" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Update notifications error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
