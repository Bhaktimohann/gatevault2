import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: any) {
  const path = req.nextUrl.pathname;

  // Public paths that don't require auth
  const publicPaths = ["/login", "/signup", "/api/auth"];
  const isPublicPath = publicPaths.some((p) => path.startsWith(p));

  // Check for token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Redirect to login if not authenticated and trying to access protected route
  if (!token && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if authenticated and trying to access login/signup
  if (token && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
