import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Cần đăng nhập sinh viên." },
      { status: 401 },
    );
  const response = await proxyBackend(
    `/students/${encodeURIComponent(session.studentId || session.username)}`,
  );
  if (!response.ok) return response;
  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.grades))
    return NextResponse.json(
      { message: "Dữ liệu điểm từ backend không hợp lệ." },
      { status: 502 },
    );
  return NextResponse.json(
    data.grades.map(
      (grade: {
        subject?: string;
        course?: string;
        credits?: number;
        score: number;
      }) => ({
        course: grade.subject || grade.course || "Môn học",
        credits: grade.credits ?? 3,
        score: grade.score,
      }),
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
