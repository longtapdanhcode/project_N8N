import type { Plugin, Connect } from "vite";
import type { TimetableEntry } from "./db.ts";

export const mockTimetable: TimetableEntry[] = [
  {
    id: "web-20261012",
    course: "Lập trình Web",
    code: "IT301 · 23IT2",
    date: "2026-10-12",
    start: "07:00",
    end: "09:30",
    room: "K.A301",
    lecturer: "ThS. Trần Quốc Huy",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
  {
    id: "db-20261012",
    course: "Cơ sở dữ liệu",
    code: "IT204 · 23IT2",
    date: "2026-10-12",
    start: "13:00",
    end: "15:30",
    room: "K.B204",
    lecturer: "TS. Nguyễn Thu Hà",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
  {
    id: "network-20261013",
    course: "Mạng máy tính",
    code: "IT205 · 23IT2",
    date: "2026-10-13",
    start: "07:00",
    end: "09:30",
    room: "K.A402",
    lecturer: "ThS. Lê Văn Phúc",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
  {
    id: "software-20261014",
    course: "Công nghệ phần mềm",
    code: "IT302 · 23IT2",
    date: "2026-10-14",
    start: "09:45",
    end: "12:00",
    room: "K.B301",
    lecturer: "TS. Phạm Thị Mai",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
];

// Real local HTTP endpoints: offline requests fail naturally instead of returning fake success.
// This file is only imported by Vite config, never bundled into the application.
export function mockApiPlugin(base: string): Plugin {
  const lessons = structuredClone(mockTimetable);
  const receipts = new Map<string, { id: string; lessonId: string }>();
  const sections = [
    {
      id: "IT301-23IT2",
      course_id: "IT301",
      course_name: "Lập trình Web",
      max_capacity: 50,
      current_enrolled: 32,
      schedule_day: 2,
      start_period: 1,
      end_period: 3,
    },
    {
      id: "IT204-23IT2",
      course_id: "IT204",
      course_name: "Cơ sở dữ liệu",
      max_capacity: 45,
      current_enrolled: 45,
      schedule_day: 4,
      start_period: 6,
      end_period: 8,
    },
  ];
  const registrations = new Set<string>();
  const submissions = new Map<
    string,
    { readToken: string; submitted: number }
  >();
  const attendance = new Map<string, Record<string, string>>();
  let failNext = 0;
  let gradeDelayMs = 0;
  const prefix = new URL(base, "http://localhost").pathname.replace(/\/$/, "");
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = new URL(req.url || "/", "http://localhost").pathname;
    if (!path.startsWith(`${prefix}/`)) return next();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    const reply = (data: unknown, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(data));
    };
    if (req.method === "GET" && path === `${prefix}/courses`) {
      reply(
        sections.map((s) => ({ id: s.course_id, course_name: s.course_name })),
      );
      return;
    }
    if (req.method === "GET" && path === `${prefix}/class-sections`) {
      reply(sections);
      return;
    }
    if (req.method === "GET" && path === `${prefix}/attendance/history`) {
      const studentId = new URL(
        req.url || "/",
        "http://localhost",
      ).searchParams.get("student_id");
      reply({
        data: [...attendance.values()].filter(
          (a) => a.student_id === studentId,
        ),
      });
      return;
    }
    if (req.method === "GET" && path.startsWith(`${prefix}/submissions/`)) {
      const id = path.split("/").at(-1)!;
      const record = submissions.get(id);
      if (!record || req.headers["x-submission-token"] !== record.readToken) {
        reply(
          { message: "Không tìm thấy bài nộp hoặc mã truy cập không hợp lệ." },
          401,
        );
        return;
      }
      const ready = Date.now() - record.submitted > 3000;
      reply({
        submissionId: id,
        status: ready ? "COMPLETED" : "QUEUED",
        ...(ready
          ? {
              feedback: {
                summary:
                  "Nhận xét minh họa: bài có bố cục rõ, cần bổ sung kiểm thử.",
                score: 8,
                strengths: ["Trình bày rõ ràng"],
                weaknesses: ["Chưa có tình huống biên"],
                suggestions: ["Bổ sung kiểm thử dữ liệu rỗng"],
              },
            }
          : {}),
      });
      return;
    }
    if (
      req.method === "POST" &&
      [
        "/faq/ask",
        "/submissions",
        "/course-registration/register",
        "/attendance/offline-sync",
      ].some((p) => path === prefix + p)
    ) {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          const body = JSON.parse(raw || "{}");
          if (path.endsWith("/faq/ask")) {
            reply({
              answer:
                "Phản hồi minh họa: hãy kiểm tra môn tiên quyết và chọn lớp còn chỗ tại mục Đăng ký học phần.",
              sources: [
                {
                  id: "demo",
                  title: "Hướng dẫn đăng ký học phần (dữ liệu minh họa)",
                },
              ],
            });
            return;
          }
          if (path.endsWith("/submissions")) {
            const id = crypto.randomUUID();
            const readToken = crypto.randomUUID();
            submissions.set(id, { readToken, submitted: Date.now() });
            reply({ submissionId: id, readToken, status: "QUEUED" });
            return;
          }
          if (path.endsWith("/register")) {
            const section = sections.find(
              (s) => s.id === body.class_section_id,
            );
            const key = `${body.student_id}:${body.class_section_id}`;
            if (
              !section ||
              section.current_enrolled >= section.max_capacity ||
              registrations.has(key)
            ) {
              reply({
                success: false,
                message: "Lớp đã đủ chỗ hoặc bạn đã đăng ký lớp này.",
              });
              return;
            }
            registrations.add(key);
            section.current_enrolled++;
            reply({
              success: true,
              message: "Đăng ký thành công (dữ liệu minh họa).",
            });
            return;
          }
          for (const record of body.records || [])
            attendance.set(
              `${record.student_id}:${record.class_section_id}:${record.session_date}`,
              { ...record, device_timestamp: record.timestamp },
            );
          reply({
            success: true,
            ack_token: `ack-${req.headers["idempotency-key"]}`,
            accepted_count: body.records.length,
          });
        } catch {
          reply({ message: "Dữ liệu không hợp lệ." }, 400);
        }
      });
      return;
    }
    if (req.method === "GET" && path === `${prefix}/timetable`) {
      res.end(JSON.stringify(lessons));
      return;
    }
    if (req.method === "GET" && path === `${prefix}/grades/me`) {
      const respond = () =>
        res.end(
          JSON.stringify([
            { course: "Lập trình Web", credits: 3, score: 8.5 },
            { course: "Cơ sở dữ liệu", credits: 3, score: 8.0 },
            { course: "Mạng máy tính", credits: 3, score: 7.8 },
          ]),
        );
      if (gradeDelayMs) setTimeout(respond, gradeDelayMs);
      else respond();
      return;
    }
    // Test controls exist only on the local mock server, never in a production backend.
    if (req.method === "GET" && path === `${prefix}/_mock/events`) {
      res.end(JSON.stringify([...receipts.values()]));
      return;
    }
    if (
      ["POST", "PUT"].includes(req.method || "") &&
      [`${prefix}/attendance`, `${prefix}/_mock/control`].includes(path)
    ) {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          const body = JSON.parse(raw || "{}");
          if (path.endsWith("/_mock/control")) {
            if (body.reset) {
              receipts.clear();
              lessons.forEach((item) => (item.attendance = "not-marked"));
            }
            failNext = Number(body.failNext || 0);
            gradeDelayMs = Number(body.gradeDelayMs || 0);
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          const key = req.headers["idempotency-key"];
          if (typeof key !== "string") {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: "Missing idempotency key" }));
            return;
          }
          if (receipts.has(key)) {
            res.end(JSON.stringify(receipts.get(key)));
            return;
          }
          if (failNext > 0) {
            failNext--;
            res.statusCode = 503;
            res.end(JSON.stringify({ message: "Temporary mock failure" }));
            return;
          }
          const lesson = lessons.find((item) => item.id === body.lessonId);
          if (!lesson || body.studentId !== "23IT112") {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: "Invalid attendance" }));
            return;
          }
          lesson.attendance = "confirmed";
          const receipt = { id: key, lessonId: lesson.id };
          receipts.set(key, receipt);
          res.end(JSON.stringify(receipt));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ message: "Invalid JSON" }));
        }
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ message: "Mock endpoint not found" }));
  };
  return {
    name: "vku-local-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
