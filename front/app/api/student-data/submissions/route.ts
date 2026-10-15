import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Dữ liệu bài nộp không hợp lệ." },
        { status: 400 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    return NextResponse.json(
      data ?? { message: "Phản hồi không hợp lệ từ máy chủ backend." },
      { status: res.status },
    );
  } catch (error) {
    console.error("Lỗi khi chuyển tiếp bài nộp sang Backend NestJS:", error);
    return NextResponse.json(
      { message: "Không thể kết nối đến máy chủ backend." },
      { status: 502 },
    );
  }
}
