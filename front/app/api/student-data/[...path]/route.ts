import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";
import { GET as grades } from "../../grades/me/route";
import { GET as timetable } from "../../timetable/route";

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
  if (subPath === "timetable" && request.method === "GET")
    return timetable(request);
  const studentId = session.studentId || session.username;
  // Web Push: the device subscribes for the MSSV in the session, never one from the body.
  if (subPath === "push/vapid-public-key" && request.method === "GET")
    return proxyBackend("/push/vapid-public-key");
  if (
    subPath === "push/subscriptions" &&
    (request.method === "POST" || request.method === "DELETE")
  ) {
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== "object" || Array.isArray(data))
      return NextResponse.json(
        { message: "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    return proxyBackend("/push/subscriptions", {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        request.method === "POST"
          ? { studentId, subscription: data.subscription }
          : { studentId, endpoint: data.endpoint },
      ),
    });
  }
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
  const response = await proxyBackend(
    `/${subPath}${query.size ? `?${query}` : ""}`,
    {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
    },
  );
  if (subPath !== "theses" || !response.ok) return response;
  // Backend search is a partial match; only return the student's own theses.
  const result = await response.json().catch(() => null);
  if (!Array.isArray(result?.data))
    return NextResponse.json(
      { message: "Dữ liệu đồ án từ backend không hợp lệ." },
      { status: 502 },
    );
  return NextResponse.json(
    {
      ...result,
      data: result.data.filter(
        (thesis: { studentId?: string }) => thesis.studentId === studentId,
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
