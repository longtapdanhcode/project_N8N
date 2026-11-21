// API contract test only. No database, n8n or live authentication service is used.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const root = new URL("../", import.meta.url);
const origin = "http://127.0.0.1:3099";
let upstreamFailure = false,
  emptyGrades = false;
const received = [];
const backend = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : undefined;
  const url = new URL(req.url, "http://fixture");
  received.push({
    path: url.pathname,
    query: url.searchParams,
    body,
    headers: req.headers,
  });
  const send = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (url.pathname === "/auth/login") {
    const role =
      body.username === "fixture-student"
        ? "STUDENT"
        : body.username === "fixture-teacher"
          ? "TEACHER"
          : body.username === "fixture-unknown"
            ? "UNKNOWN"
            : null;
    if (!role || body.password !== "fixture-password")
      return send({ message: "Thông tin kiểm thử không hợp lệ" }, 401);
    return send({
      success: true,
      user: {
        username: body.username,
        studentId: "SV_FIXTURE",
        name: "Tài khoản kiểm thử",
        role,
      },
    });
  }
  if (url.pathname === "/class-sections")
    return upstreamFailure
      ? send({ message: "Fixture unavailable" }, 503)
      : send([{ id: "SECTION_FIXTURE", course_name: "Môn kiểm thử" }]);
  if (url.pathname === "/courses") return send([]);
  if (url.pathname === "/push/vapid-public-key")
    return send({ publicKey: "fixture-public-key" });
  if (url.pathname === "/push/subscriptions") return send({ success: true });
  if (url.pathname === "/students/SV_FIXTURE/timetable")
    return send([
      {
        id: "SV_FIXTURE:SECTION_FIXTURE:2026-11-16",
        studentId: "SV_FIXTURE",
        classSectionId: "SECTION_FIXTURE",
        course: "Môn kiểm thử",
        code: "SECTION_FIXTURE",
        date: "2026-11-16",
        start: "07:00",
        end: "09:30",
        room: "",
        lecturer: "",
        attendance: "not-marked",
        updatedAt: 0,
        scheduled: true,
      },
    ]);
  if (url.pathname === "/students/SV_FIXTURE")
    return send({
      grades: emptyGrades
        ? []
        : [{ subject: "Môn kiểm thử", score: 0, credits: 2 }],
    });
  if (url.pathname === "/theses")
    return send({
      data: [
        { _id: "own-thesis", studentId: "SV_FIXTURE" },
        { _id: "other-thesis", studentId: "SV_FIXTURE_OTHER" },
      ],
    });
  if (url.pathname === "/students") return send({ data: [], total: 0 });
  if (url.pathname === "/academic-warning/scan" && req.method === "POST")
    return send({ success: true, violations: [] });
  if (url.pathname === "/ai/ask" && req.method === "POST")
    return send({ answer: "Phản hồi kiểm thử" });
  if (url.pathname === "/submissions" && req.method === "GET")
    return send({
      data: [
        {
          _id: "submission-fixture",
          submissionId: "submission-fixture",
          studentId: "SV_FIXTURE",
          studentName: null,
          assignmentTitle: "Fixture",
          content: "",
          criteria: [],
          status: "QUEUED",
          model: null,
          feedback: null,
          createdAt: "2026-11-18T01:00:00.000Z",
          updatedAt: "2026-11-18T01:00:00.000Z",
        },
      ],
      total: 1,
      page: 2,
      pageSize: 20,
      totalPages: 1,
    });
  if (url.pathname === "/submissions" && req.method === "POST")
    return send({
      submissionId: "submission-fixture",
      readToken: "token-fixture",
      status: "QUEUED",
    });
  if (url.pathname === "/submissions/submission-fixture")
    return req.headers["x-submission-token"] === "token-fixture"
      ? send({ submissionId: "submission-fixture", status: "COMPLETED" })
      : send({ message: "Invalid token" }, 401);
  if (url.pathname === "/faq/ask") return send({ answer: "Phản hồi kiểm thử" });
  if (url.pathname === "/attendance/history") return send({ data: [] });
  if (url.pathname === "/attendance/offline-sync")
    return send({ success: true, ack_token: "ack-fixture" });
  if (
    url.pathname === "/course-registration/register" ||
    url.pathname === "/theses/own-thesis/milestones/m1"
  )
    return send({ success: true });
  return send({ message: "Unexpected fixture endpoint" }, 404);
});
await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));
const backendUrl = `http://127.0.0.1:${backend.address().port}`;
// Same key across a restart so session cookies issued earlier stay valid.
const sessionSecret = randomBytes(48).toString("hex");
let server;
let log = "";
let startedAt = 0;
function startServer() {
  startedAt = log.length;
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--port",
      "3099",
      "--hostname",
      "127.0.0.1",
    ],
    {
      cwd: new URL("front/", root),
      windowsHide: true,
      env: {
        ...process.env,
        AUTH_SESSION_SECRET: sessionSecret,
        BACKEND_INTERNAL_URL: backendUrl,
        BACKEND_URL: backendUrl,
        NEXT_PUBLIC_BACKEND_URL: backendUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    log += chunk;
  });
  server.stderr.on("data", (chunk) => {
    log += chunk;
  });
}
async function waitReady() {
  for (let i = 0; !log.slice(startedAt).includes("Ready in"); i++) {
    if (i >= 60 || server.exitCode !== null)
      throw new Error(
        `Temporary frontend failed to start (exit ${server.exitCode}); check port 3099\n${log.slice(-4000)}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
startServer();

// Next.js 16.4 `next dev` exits with code 1 when it detects an AI agent and has an
// upgrade advisory to print (see next/dist/lib/upgrade/nudge.js); the next start is
// let through. That made this test fail on every other run under agents only.
// Restart once in that exact case; any other exit is still a failure.
const UPGRADE_NUDGE = "stopped to show the upgrade recommendation";
let nudgeRestarts = 0;
// `next dev` can also drop the connection while compiling a route on first hit.
// Retry only GETs, and only on connection errors: an HTTP response of any status
// is returned as-is, so status assertions stay strict.
const CONNECTION_RETRIES = 3;
const request = async (path, options = {}) => {
  const method = options.method || "GET";
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(origin + path, {
        redirect: "manual",
        ...options,
        headers: { Origin: origin, ...options.headers },
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      const connectionError =
        error.name !== "TimeoutError" && error.name !== "AbortError";
      if (connectionError) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        if (
          server.exitCode !== null &&
          log.slice(startedAt).includes(UPGRADE_NUDGE) &&
          nudgeRestarts < 1
        ) {
          nudgeRestarts++;
          console.warn(
            "next dev stopped for an upgrade advisory; restarting it once. Run `npm audit` in front/.",
          );
          startServer();
          await waitReady();
          continue;
        }
        if (method === "GET" && server.exitCode === null && attempt < CONNECTION_RETRIES)
          continue;
      }
      // Name the request and keep the dev server output so failures are diagnosable.
      throw new Error(
        `${method} ${path} failed after ${attempt + 1} attempt(s): ${error.cause?.message || error.message}\n--- next dev log (tail) ---\n${log.slice(-4000)}`,
        { cause: error },
      );
    }
  }
};
const jsonPost = (body, cookie) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  },
  body: JSON.stringify(body),
});
async function login(username) {
  const response = await request(
    "/api/session",
    jsonPost({ username, password: "fixture-password" }),
  );
  assert.equal(response.status, 200);
  assert.ok(/HttpOnly/i.test(response.headers.get("set-cookie") || ""));
  return response.headers.get("set-cookie").split(";")[0];
}
try {
  await waitReady();
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/teacher")).status, 307);
  assert.equal((await request("/student/index.html")).status, 307);
  for (const path of [
    "/api/student-data/class-sections",
    "/api/student-data/submissions/s1",
    "/api/submissions",
    "/api/grades/me",
    "/api/timetable",
  ]) {
    assert.equal((await request(path)).status, 401, path);
  }
  assert.equal(
    (await request("/api/student-data/submissions", jsonPost({}))).status,
    401,
  );
  // The portal must never forward unauthenticated traffic straight to the backend.
  for (const [path, options] of [
    ["/api/students/SV_FIXTURE", {}],
    ["/api/test-webhook", jsonPost({})],
    ["/api/documents/ingest-text", jsonPost({ title: "x", content: "x" })],
    ["/student/api/students", {}],
  ]) {
    assert.equal((await request(path, options)).status, 404, path);
  }
  assert.equal(received.length, 0, "No backend call without a session");
  assert.equal((await request("/api/teacher-data/students")).status, 401);
  assert.equal(
    (await request("/api/ai/ask", jsonPost({ question: "Fixture" }))).status,
    401,
  );
  assert.equal(
    (
      await request(
        "/api/session",
        jsonPost({ username: {}, password: "invalid" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/session", {
        ...jsonPost({}),
        headers: { Origin: "https://invalid.example" },
      })
    ).status,
    403,
  );
  for (const username of ["gv.demo", "23IT112"]) {
    assert.equal(
      (
        await request(
          "/api/session",
          jsonPost({ username, password: "DemoSV2026!" }),
        )
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await request(
        "/api/session",
        jsonPost({ username: "fixture-unknown", password: "fixture-password" }),
      )
    ).status,
    403,
  );
  const student = await login("fixture-student");
  const teacher = await login("fixture-teacher");
  const headers = { Cookie: student };
  assert.equal(
    (await request("/api/student-data/class-sections", { headers })).status,
    200,
  );
  assert.ok(
    !received.some((r) => r.path.startsWith("/student-data/")),
    "Never send the portal prefix to backend",
  );
  assert.equal(
    (
      await request("/api/student-data/class-sections", {
        headers: { Cookie: teacher },
      })
    ).status,
    401,
  );
  assert.equal((await request("/api/submissions", { headers })).status, 401);
  assert.equal((await request("/teacher", { headers })).status, 307);
  assert.equal(
    (await request("/api/teacher-data/students", { headers })).status,
    401,
  );
  assert.equal(
    (await request("/api/ai/ask", jsonPost({ question: "Fixture" }, student)))
      .status,
    401,
  );
  const teacherHeaders = { Cookie: teacher };
  assert.equal(
    (await request("/api/teacher-data/students?page=2", { headers: teacherHeaders }))
      .status,
    200,
  );
  assert.equal(received.at(-1).query.get("page"), "2");
  const submissions = await request(
    "/api/submissions?page=2&search=Fixture&sortBy=student&sortOrder=asc",
    { headers: teacherHeaders },
  );
  assert.equal(submissions.status, 200);
  const submissionList = await submissions.json();
  assert.equal(submissionList.data[0].studentName, "Chưa có họ tên");
  assert.equal(received.at(-1).path, "/submissions");
  assert.equal(received.at(-1).query.get("page"), "2");
  assert.equal(received.at(-1).query.get("search"), "Fixture");
  // Id cột "student" được đổi thành trường backend studentId.
  assert.equal(received.at(-1).query.get("sortBy"), "studentId");
  for (const path of [
    "/api/teacher-data/test-hybrid-search",
    "/api/teacher-data/auth/login",
    "/api/teacher-data/api/internal/submissions/s1",
  ]) {
    assert.equal(
      (await request(path, { headers: teacherHeaders })).status,
      404,
      path,
    );
  }
  assert.equal(
    (
      await request(
        "/api/teacher-data/academic-warning/scan",
        jsonPost({ limit: 1 }, teacher),
      )
    ).status,
    200,
  );
  assert.equal(received.at(-1).body.limit, 1);
  assert.equal(
    (
      await request(
        "/api/ai/ask",
        jsonPost({ question: "Fixture", userId: "FORGED" }, teacher),
      )
    ).status,
    200,
  );
  assert.equal(received.at(-1).body.userId, "fixture-teacher");
  const conversationId = "44444444-4444-4444-8444-444444444444";
  await request(
    "/api/ai/ask",
    jsonPost({ question: "Hỏi tiếp", conversationId }, teacher),
  );
  assert.equal(received.at(-1).body.conversationId, conversationId);
  await request(
    "/api/ai/ask",
    jsonPost({ question: "Hỏi tiếp", conversationId: { $ne: null } }, teacher),
  );
  assert.equal(received.at(-1).body.conversationId, undefined);
  const theses = await (
    await request("/api/student-data/theses", { headers })
  ).json();
  assert.deepEqual(
    theses.data.map((thesis) => thesis._id),
    ["own-thesis"],
  );
  assert.equal(
    (await request("/api/student-data/students/ANOTHER_STUDENT", { headers }))
      .status,
    404,
  );
  let grades = await request("/api/student-data/grades/me", { headers });
  assert.equal((await grades.json())[0].score, 0);
  emptyGrades = true;
  grades = await request("/api/grades/me", { headers });
  assert.deepEqual(await grades.json(), []);
  upstreamFailure = true;
  assert.equal(
    (await request("/api/student-data/class-sections", { headers })).status,
    503,
  );
  upstreamFailure = false;
  const receipt = await (
    await request(
      "/api/student-data/submissions",
      jsonPost(
        { studentId: "FORGED", assignmentTitle: "Fixture", content: "Fixture" },
        student,
      ),
    )
  ).json();
  assert.equal(received.at(-1).body.studentId, "SV_FIXTURE");
  assert.equal(
    (
      await request("/api/student-data/submissions/" + receipt.submissionId, {
        headers,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/student-data/submissions/" + receipt.submissionId, {
        headers: { ...headers, "x-submission-token": receipt.readToken },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/api/student-data/faq/ask",
        jsonPost({ question: "" }, student),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/student-data/faq/ask",
        jsonPost({ question: "Fixture", studentId: "FORGED" }, student),
      )
    ).status,
    200,
  );
  assert.equal(received.at(-1).body.studentId, "SV_FIXTURE");
  assert.equal(received.at(-1).body.conversationId, undefined);
  await request(
    "/api/student-data/faq/ask",
    jsonPost({ question: "Hỏi tiếp", conversationId }, student),
  );
  assert.equal(received.at(-1).body.conversationId, conversationId);
  assert.equal(
    (
      await request("/api/student-data/attendance/history?student_id=FORGED", {
        headers,
      })
    ).status,
    200,
  );
  assert.equal(received.at(-1).query.get("student_id"), "SV_FIXTURE");
  assert.equal(
    (
      await request(
        "/api/student-data/course-registration/register",
        jsonPost(
          { student_id: "FORGED", class_section_id: "SECTION_FIXTURE" },
          student,
        ),
      )
    ).status,
    200,
  );
  assert.equal(received.at(-1).body.student_id, "SV_FIXTURE");
  assert.equal(
    (
      await request(
        "/api/student-data/attendance/offline-sync",
        jsonPost({ records: [{ student_id: "OTHER_ACCOUNT" }] }, student),
      )
    ).status,
    403,
  );
  const attendance = jsonPost(
    {
      records: [
        { student_id: "SV_FIXTURE", timestamp: "2026-10-16T01:00:00Z" },
      ],
    },
    student,
  );
  attendance.headers["Idempotency-Key"] = "fixture-id";
  assert.equal(
    (await request("/api/student-data/attendance/offline-sync", attendance))
      .status,
    200,
  );
  assert.equal(received.at(-1).body.records[0].student_id, "SV_FIXTURE");
  assert.equal(
    received.at(-1).body.records[0].timestamp,
    "2026-10-16T01:00:00Z",
  );
  assert.equal(received.at(-1).headers["idempotency-key"], "fixture-id");
  for (const id of ["own-thesis", "other-thesis"]) {
    const options = {
      ...jsonPost({ status: "COMPLETED" }, student),
      method: "PATCH",
    };
    assert.equal(
      (await request(`/api/student-data/theses/${id}/milestones/m1`, options))
        .status,
      id === "own-thesis" ? 200 : 403,
    );
  }
  for (const path of [
    "/api/student-data/timetable?from=2026-11-16&studentId=FORGED",
    "/api/timetable?from=2026-11-16&student_id=FORGED",
  ]) {
    const timetable = await request(path, { headers });
    assert.equal(timetable.status, 200, path);
    assert.equal((await timetable.json())[0].classSectionId, "SECTION_FIXTURE");
    // MSSV lấy từ phiên; chỉ from/to/semester được chuyển tiếp.
    assert.equal(received.at(-1).path, "/students/SV_FIXTURE/timetable");
    assert.equal(received.at(-1).query.get("from"), "2026-11-16");
    assert.equal(received.at(-1).query.get("studentId"), null);
    assert.equal(received.at(-1).query.get("student_id"), null);
  }
  // Web Push: the device is registered for the session's MSSV, not one from the body.
  const vapid = await request("/api/student-data/push/vapid-public-key", { headers });
  assert.equal(vapid.status, 200);
  assert.equal((await vapid.json()).publicKey, "fixture-public-key");
  const pushSubscription = {
    endpoint: "https://push.example.com/fixture",
    keys: { p256dh: "p", auth: "a" },
  };
  assert.equal(
    (
      await request(
        "/api/student-data/push/subscriptions",
        jsonPost({ studentId: "FORGED", subscription: pushSubscription }, student),
      )
    ).status,
    200,
  );
  assert.equal(received.at(-1).path, "/push/subscriptions");
  assert.deepEqual(received.at(-1).body, {
    studentId: "SV_FIXTURE",
    subscription: pushSubscription,
  });
  assert.equal(
    (
      await request("/api/student-data/push/subscriptions", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: "FORGED", endpoint: pushSubscription.endpoint }),
      })
    ).status,
    200,
  );
  assert.deepEqual(received.at(-1).body, {
    studentId: "SV_FIXTURE",
    endpoint: pushSubscription.endpoint,
  });
  assert.equal(
    (
      await request(
        "/api/student-data/push/subscriptions",
        jsonPost({ subscription: pushSubscription }),
      )
    ).status,
    401,
  );
  const logout = await request("/api/session", { method: "DELETE", headers });
  assert.equal(logout.status, 200);
  assert.ok(/Max-Age=0/.test(logout.headers.get("set-cookie")));
  await new Promise((resolve) => backend.close(resolve));
  assert.equal(
    (await request("/api/student-data/class-sections", { headers })).status,
    502,
  );
  assert.equal(
    (
      await request(
        "/api/session",
        jsonPost({ username: "gv.demo", password: "DemoGV2026!" }),
      )
    ).status,
    503,
  );
  console.log(
    "PASS: real API routing, backend-only login, role guards, ownership, empty grades, upstream failure, token/ACK forwarding and logout. Fixture only; no live database or workflow.",
  );
} finally {
  if (backend.listening) await new Promise((resolve) => backend.close(resolve));
  if (server.pid) {
    if (process.platform === "win32")
      await new Promise((resolve) =>
        spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        }).on("exit", resolve),
      );
    else server.kill("SIGTERM");
  }
}
