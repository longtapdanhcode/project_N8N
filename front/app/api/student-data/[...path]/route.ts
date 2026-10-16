import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";
import { GET as grades } from "../../grades/me/route";

async function handle(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Cần đăng nhập sinh viên." },
      { status: 401 },
    );
  const subPath = request.nextUrl.pathname.replace(
    /^\/api\/student-data\/?/,
    "",
  );
  if (subPath === "grades/me" && request.method === "GET")
    return grades(request);
  if (subPath === "timetable")
    return NextResponse.json(
      { message: "Backend chưa cung cấp API lịch học cá nhân." },
      { status: 501 },
    );
  const studentId = session.studentId || session.username;
  const query = new URLSearchParams(request.nextUrl.search);
  const allowedRead = [
    "courses",
    "class-sections",
    "attendance/history",
    "theses",
    `students/${encodeURIComponent(studentId)}`,
  ];
  const milestone = /^theses\/([^/]+)\/milestones\/([^/]+)$/.exec(subPath);
  if (
    !(request.method === "GET" && allowedRead.includes(subPath)) &&
    !(
      request.method === "POST" &&
      ["attendance/offline-sync", "course-registration/register"].includes(
        subPath,
      )
    ) &&
    !(request.method === "PATCH" && milestone)
  ) {
    return NextResponse.json(
      { message: "Không tìm thấy API sinh viên." },
      { status: 404 },
    );
  }
  if (subPath === "attendance/history") query.set("student_id", studentId);
  if (subPath === "theses") query.set("search", studentId);
  if (milestone) {
    const ownResponse = await proxyBackend(
      `/theses?search=${encodeURIComponent(studentId)}&pageSize=100`,
    );
    if (!ownResponse.ok) return ownResponse;
    const own = await ownResponse.json().catch(() => null);
    if (
      !own?.data?.some(
        (thesis: { _id: string; studentId: string }) =>
          thesis._id === milestone[1] && thesis.studentId === studentId,
      )
    ) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật đồ án này." },
        { status: 403 },
      );
    }
  }
  let body: string | undefined;
  if (["POST", "PATCH"].includes(request.method)) {
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== "object" || Array.isArray(data))
      return NextResponse.json(
        { message: "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    if (subPath === "course-registration/register") data.student_id = studentId;
    if (subPath === "attendance/offline-sync") {
      if (!Array.isArray(data.records))
        return NextResponse.json(
          { message: "Danh sách điểm danh không hợp lệ." },
          { status: 400 },
        );
      // Keep queued records owned by their original account when users switch on one device.
      if (
        data.records.some(
          (record: Record<string, unknown> | null) =>
            !record || record.student_id !== studentId,
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Phiếu điểm danh thuộc tài khoản khác. Đăng nhập đúng tài khoản để đồng bộ.",
          },
          { status: 403 },
        );
      }
    }
    body = JSON.stringify(data);
  }
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const name of ["idempotency-key", "x-submission-token"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return proxyBackend(`/${subPath}${query.size ? `?${query}` : ""}`, {
    method: request.method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
