import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const publicPaths = ["/login", "/signup", "/api/auth"];

    const isPublicPath = publicPaths.some((p) => path.startsWith(p));

    if (!token && !isPublicPath) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (token && (path === "/login" || path === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};