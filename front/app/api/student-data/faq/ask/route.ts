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
  if (
    typeof body?.question !== "string" ||
    !body.question.trim() ||
    body.question.length > 4000
  ) {
    return NextResponse.json(
      { message: "Câu hỏi phải có nội dung và tối đa 4000 ký tự." },
      { status: 400 },
    );
  }
  return proxyBackend("/faq/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: body.question.trim(),
      studentId: session.studentId || session.username,
    }),
  });
}
