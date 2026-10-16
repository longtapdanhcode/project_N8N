import { NextRequest, NextResponse } from "next/server";
import { fetchSubmissions } from "@/lib/submissions";
import { COOKIE, readSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  if (readSession(request.cookies.get(COOKIE)?.value)?.role !== "teacher") {
    return NextResponse.json(
      { message: "Cần đăng nhập giảng viên." },
      { status: 401 },
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  try {
    const result = await fetchSubmissions({
      page,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không tải được danh sách bài nộp. Kiểm tra kết nối database.",
      },
      { status: 502 },
    );
  }
}
