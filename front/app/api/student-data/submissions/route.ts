import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Cần đăng nhập sinh viên." },
      { status: 401 },
    );
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json(
      { message: "Dữ liệu bài nộp không hợp lệ." },
      { status: 400 },
    );
  return proxyBackend("/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      studentId: session.studentId || session.username,
    }),
  });
}
