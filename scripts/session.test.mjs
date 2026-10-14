import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { signSession, readSession, destination } from "../front/lib/session.ts";
const secret = randomBytes(48).toString("hex");
test("signed session preserves server role and routes correctly", () => {
  for (const role of ["teacher", "student"]) {
    const session = {
      username: "test-only",
      name: "Dữ liệu mẫu",
      role,
      expires: Date.now() + 10000,
    };
    assert.deepEqual(
      readSession(signSession(session, secret), secret),
      session,
    );
    assert.equal(
      destination(role),
      role === "teacher" ? "/teacher" : "/student/index.html",
    );
  }
});
test("rejects tampered role, wrong key, expired or malformed cookie", () => {
  const session = {
    username: "test-only",
    name: "Dữ liệu mẫu",
    role: "student",
    expires: Date.now() + 10000,
  };
  const token = signSession(session, secret);
  const changed =
    Buffer.from(JSON.stringify({ ...session, role: "teacher" })).toString(
      "base64url",
    ) +
    "." +
    token.split(".")[1];
  for (const value of [changed, "bad", "a.b.c", ""])
    assert.equal(readSession(value, secret), null);
  assert.equal(readSession(token, "x".repeat(48)), null);
  assert.equal(
    readSession(signSession({ ...session, expires: 0 }, secret), secret),
    null,
  );
  assert.equal(
    readSession(signSession({ ...session, role: "admin" }, secret), secret),
    null,
  );
});
