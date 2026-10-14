import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const request = (path, init = {}) =>
  fetch(base + path, {
    redirect: "manual",
    ...init,
    headers: { origin: base, ...init.headers },
  });
const login = async (username, password) => {
  const res = await request("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(res.status, 200, "Demo login must succeed");
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Session cookie required");
  assert.ok(
    /HttpOnly/i.test(res.headers.get("set-cookie") || ""),
    "Cookie must be HttpOnly",
  );
  return { cookie, destination: (await res.json()).destination };
};
let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log("PASS " + name);
}
await check("login page and anonymous route guards", async () => {
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/teacher")).status, 307);
  assert.equal((await request("/student/index.html")).status, 307);
  assert.equal((await request("/api/student-data/timetable")).status, 401);
});
await check("invalid credentials and cross-origin login rejected", async () => {
  assert.equal(
    (
      await request("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: {}, password: "invalid" }),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/session", {
        method: "POST",
        headers: {
          origin: "https://invalid.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
});
const teacher = await login("gv.demo", "DemoGV2026!");
await check("teacher login, pages and student boundary", async () => {
  assert.equal(teacher.destination, "/teacher");
  for (const path of [
    "/teacher",
    "/teacher/students",
    "/teacher/attendance",
    "/teacher/projects",
    "/teacher/documents",
    "/teacher/settings",
  ]) {
    const res = await request(path, { headers: { cookie: teacher.cookie } });
    assert.equal(res.status, 200, `${path} status`);
    const text = await res.text();
    assert.ok(text.includes("portal-tabs"), `${path} shared navigation`);
  }
  assert.equal(
    (
      await request("/student/index.html", {
        headers: { cookie: teacher.cookie },
      })
    ).status,
    307,
  );
  assert.equal(
    (
      await request("/api/student-data/timetable", {
        headers: { cookie: teacher.cookie },
      })
    ).status,
    401,
  );
});
const student = await login("23IT112", "DemoSV2026!");
await check("student login, static app and mock API on port 3000", async () => {
  assert.equal(student.destination, "/student/index.html");
  const res = await request(student.destination, {
    headers: { cookie: student.cookie },
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("/student/assets/"));
  const timetable = await request("/api/student-data/timetable", {
    headers: { cookie: student.cookie },
  });
  assert.equal(timetable.status, 200);
  assert.ok((await timetable.json()).length);
  const faq = await request("/api/student-data/faq/ask", {
    method: "POST",
    headers: { cookie: student.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Câu hỏi kiểm thử",
      studentId: "23IT112",
    }),
  });
  assert.equal(faq.status, 200);
  assert.ok((await faq.json()).answer);
  assert.equal(
    (await request("/teacher", { headers: { cookie: student.cookie } })).status,
    307,
  );
  const manifest = await (
    await request("/student/manifest.webmanifest")
  ).json();
  assert.equal(manifest.scope, "/student/");
  assert.equal((await request("/student/sw.js")).status, 200);
});
await check(
  "logout clears cookie and anonymous requests require login",
  async () => {
    const res = await request("/api/session", {
      method: "DELETE",
      headers: { cookie: student.cookie },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie"), /Max-Age=0/);
    assert.equal((await request("/api/session")).status, 401);
  },
);
console.log(`${count} portal HTTP checks passed. Only demo data used.`);
