import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Cần đăng nhập sinh viên." },
      { status: 401 },
    );
  const token = request.headers.get("x-submission-token");
  if (!token)
    return NextResponse.json(
      { message: "Thiếu mã truy cập bài nộp." },
      { status: 401 },
    );
  const { id } = await params;
  return proxyBackend(`/submissions/${encodeURIComponent(id)}`, {
    headers: { "x-submission-token": token },
  });
}
