import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { message: "Chưa đăng nhập." },
      { status: 401 }
    );
  }
  return NextResponse.json(session, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
