import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";

// Lịch học của chính sinh viên trong phiên; MSSV không bao giờ lấy từ query.
export async function GET(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Cần đăng nhập sinh viên." },
      { status: 401 },
    );
  const studentId = session.studentId || session.username;
  const query = new URLSearchParams();
  for (const key of ["from", "to", "semester"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const suffix = query.size ? `?${query}` : "";
  return proxyBackend(
    `/students/${encodeURIComponent(studentId)}/timetable${suffix}`,
  );
}
