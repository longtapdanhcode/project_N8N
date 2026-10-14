import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession, destination } from "./lib/session";
export function proxy(req: NextRequest) {
  const session = readSession(req.cookies.get(COOKIE)?.value);
  const path = req.nextUrl.pathname;
  if (path === "/")
    return session
      ? NextResponse.redirect(new URL(destination(session.role), req.url))
      : NextResponse.next();
  if (!session) return NextResponse.redirect(new URL("/", req.url));
  const role = path.startsWith("/teacher") ? "teacher" : "student";
  return session.role === role
    ? NextResponse.next()
    : NextResponse.redirect(new URL(destination(session.role), req.url));
}
export const config = {
  matcher: ["/", "/teacher/:path*", "/student", "/student/index.html"],
};
