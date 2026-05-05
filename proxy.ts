import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const publicPaths = [
    "/login",
    "/signup",
    "/admin-signup",
    "/hod-signup",
    "/warden-signup",
    "/security-signup",
    "/api/auth",
  ];
  const isPublicPath = publicPaths.some((p) => path.startsWith(p));

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
