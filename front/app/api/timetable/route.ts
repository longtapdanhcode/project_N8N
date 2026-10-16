import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
export async function GET(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Cần đăng nhập sinh viên." },
      { status: 401 },
    );
  return NextResponse.json(
    { message: "Backend chưa cung cấp API lịch học cá nhân." },
    { status: 501 },
  );
}
