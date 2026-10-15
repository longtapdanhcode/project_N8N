import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "Mã bài nộp không hợp lệ." },
      { status: 400 },
    );
  }

  try {

    const token = request.headers.get("x-submission-token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["x-submission-token"] = token;
    }

    const res = await fetch(
      `${BACKEND_URL}/submissions/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    const data = await res.json().catch(() => null);

    return NextResponse.json(
      data ?? { message: "Phản hồi không hợp lệ từ máy chủ backend." },
      { status: res.status },
    );
  } catch (error) {
    console.error(`Lỗi khi tra cứu bài nộp ${id} từ Backend NestJS:`, error);
    return NextResponse.json(
      { message: "Không thể kết nối đến máy chủ backend." },
      { status: 502 },
    );
  }
}
