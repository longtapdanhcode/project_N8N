import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student") {
    return NextResponse.json(
      { message: "Bạn cần đăng nhập bằng tài khoản sinh viên." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.question) {
      return NextResponse.json(
        { message: "Câu hỏi không hợp lệ." },
        { status: 400 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/faq/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: body.question,
        studentId: body.studentId || session.studentId || session.username,
      }),
      signal: AbortSignal.timeout(130_000),
    });

    const data = await res.json().catch(() => null);

    return NextResponse.json(
      data ?? { message: "Phản hồi không hợp lệ từ máy chủ backend." },
      { status: res.status },
    );
  } catch (error) {
    console.error("Lỗi khi chuyển tiếp câu hỏi FAQ sang Backend NestJS:", error);
    return NextResponse.json(
      { message: "Không thể kết nối đến máy chủ FAQ." },
      { status: 502 },
    );
  }
}
