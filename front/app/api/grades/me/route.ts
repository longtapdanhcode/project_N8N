import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  const studentId = session?.studentId || session?.username || "23IT143";

  try {
    const res = await fetch(`${BACKEND_URL}/students/${encodeURIComponent(studentId)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const studentData = await res.json();
      if (Array.isArray(studentData.grades) && studentData.grades.length > 0) {
        return NextResponse.json(
          studentData.grades.map((g: any) => ({
            course: g.subject || g.course || "Môn học",
            credits: g.credits || 3,
            score: g.score || 0,
          })),
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }
    }
  } catch (e) {
    console.warn("Could not load real grades from backend:", e);
  }

  // Fallback student grades
  return NextResponse.json(
    [
      { course: "Lập trình Web", credits: 3, score: 8.5 },
      { course: "Cơ sở dữ liệu", credits: 3, score: 8.0 },
      { course: "Mạng máy tính", credits: 3, score: 7.8 },
      { course: "Công nghệ phần mềm", credits: 3, score: 8.2 },
    ],
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
