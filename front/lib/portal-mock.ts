import {
  MOCK_STUDENTS,
  MOCK_THESES,
  MOCK_ATTENDANCE_RECORDS,
  calculateDashboardKPIs,
} from "./mock";
const documents = [
  {
    id: "demo-quyche",
    title: "Hướng dẫn học tập (minh họa)",
    content:
      "Sinh viên theo dõi lịch học, điểm danh và liên hệ cố vấn khi cần hỗ trợ.",
    created_at: "2026-10-01T00:00:00Z",
  },
];
function page<T extends object>(rows: T[], q: URLSearchParams) {
  const search = (q.get("search") || "").toLowerCase();
  const filtered = rows.filter((row) => {
    const r = row as Record<string, unknown>;
    return (
      (!search ||
        Object.values(row).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(search),
        )) &&
      ["classId", "major", "status", "defenseStatus"].every(
        (key) => !q.get(key) || q.get(key) === "ALL" || r[key] === q.get(key),
      ) &&
      (q.get("attendanceWarningOnly") !== "true" ||
        r.attendanceWarning === true)
    );
  });
  const key = q.get("sortBy");
  if (key)
    filtered.sort((a, b) => {
      const x = (a as Record<string, unknown>)[key],
        y = (b as Record<string, unknown>)[key];
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y))) *
        (q.get("sortOrder") === "desc" ? -1 : 1)
      );
    });
  const page = Math.max(1, Number(q.get("page")) || 1),
    pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize")) || 20));
  return {
    data: filtered.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}
export async function mockTeacherFetch(url: string, init: RequestInit = {}) {
  const { pathname: p, searchParams: q } = new URL(url, "http://localhost");
  let result: unknown;
  if (p === "/dashboard/kpis") result = calculateDashboardKPIs();
  else if (p === "/students/classes")
    result = [...new Set(MOCK_STUDENTS.map((s) => s.classId))];
  else if (p === "/students/top-violators")
    result = MOCK_STUDENTS.filter((s) => s.attendanceWarning).slice(
      0,
      Number(q.get("limit")) || 5,
    );
  else if (p === "/students") result = page(MOCK_STUDENTS, q);
  else if (p.startsWith("/students/"))
    result = MOCK_STUDENTS.find(
      (s) => s.studentId === decodeURIComponent(p.split("/").at(-1)!),
    );
  else if (p === "/attendance/records")
    result = page(MOCK_ATTENDANCE_RECORDS, q);
  else if (p === "/theses") result = page(MOCK_THESES, q);
  else if (p.startsWith("/theses/") && init.method === "PATCH") {
    const [, , id, , mid] = p.split("/");
    const thesis = MOCK_THESES.find((t) => t._id === id);
    const m = thesis?.milestones.find((m) => m._id === mid);
    if (!m || !thesis)
      return Response.json({ message: "Không tìm thấy mốc." }, { status: 404 });
    const body = JSON.parse(String(init.body));
    m.status = body.status;
    m.aiFeedback =
      body.status === "COMPLETED"
        ? "Phản hồi minh họa: đã ghi nhận mốc hoàn thành."
        : undefined;
    thesis.progressPercent = Math.round(
      (thesis.milestones.filter((m) => m.status === "COMPLETED").length /
        thesis.milestones.length) *
        100,
    );
    result = { success: true };
  } else if (p === "/academic-warning/scan")
    result = {
      success: true,
      total_violations: 0,
      dispatched_count: 0,
      violations: [],
    };
  else if (p === "/ai/ask")
    result = {
      answer:
        "Đây là câu trả lời minh họa. Bạn có thể tra cứu hồ sơ sinh viên và tiến độ đồ án trong các mục phía trên.",
      confidence_score: 1,
      citations: ["Dữ liệu thử nghiệm"],
      requires_human_escalation: false,
    };
  else if (p === "/documents")
    result = {
      data: documents.slice(
        Number(q.get("offset")) || 0,
        (Number(q.get("offset")) || 0) + 20,
      ),
    };
  else if (p.startsWith("/documents/ingest-")) {
    const form = init.body instanceof FormData ? init.body : null;
    const data = form
      ? {
          title: String(form.get("title")),
          content: await (form.get("file") as File).text(),
        }
      : JSON.parse(String(init.body));
    documents.unshift({
      id: crypto.randomUUID(),
      title: data.title,
      content: data.content,
      created_at: new Date().toISOString(),
    });
    result = { success: true, chunks_created: 1 };
  }
  return result === undefined
    ? Response.json(
        { message: "Chưa có dữ liệu minh họa cho mục này." },
        { status: 404 },
      )
    : Response.json(result);
}
