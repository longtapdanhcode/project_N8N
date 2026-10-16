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
  if (url.pathname === "/students/SV_FIXTURE")
    return send({
      grades: emptyGrades
        ? []
        : [{ subject: "Môn kiểm thử", score: 0, credits: 2 }],
    });
  if (url.pathname === "/theses")
    return send({ data: [{ _id: "own-thesis", studentId: "SV_FIXTURE" }] });
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
const server = spawn(
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
      AUTH_SESSION_SECRET: randomBytes(48).toString("hex"),
      BACKEND_INTERNAL_URL: backendUrl,
      BACKEND_URL: backendUrl,
      NEXT_PUBLIC_BACKEND_URL: backendUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
server.stdout.on("data", (chunk) => {
  log += chunk;
});
server.stderr.on("data", (chunk) => {
  log += chunk;
});
const request = (path, options = {}) =>
  fetch(origin + path, {
    redirect: "manual",
    ...options,
    headers: { Origin: origin, ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
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
  for (let i = 0; !log.includes("Ready in"); i++) {
    if (i >= 60 || server.exitCode !== null)
      throw new Error("Temporary frontend failed to start; check port 3099");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
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
  assert.equal(
    (await request("/api/student-data/timetable", { headers })).status,
    501,
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
