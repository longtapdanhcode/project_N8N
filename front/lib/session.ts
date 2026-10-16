import { createHmac, timingSafeEqual } from "node:crypto";

export type Role = "teacher" | "student";
export interface Session {
  username: string;
  name: string;
  role: Role;
  expires: number;
  studentId?: string;
  email?: string;
  department?: string;
}
export const COOKIE = "vku_session";
export const destination = (role: Role) =>
  role === "teacher" ? "/teacher" : "/student/index.html";

export function signSession(
  session: Session,
  secret = process.env.AUTH_SESSION_SECRET,
): string {
  if (!secret || secret.length < 32)
    throw new Error(
      "Chưa cấu hình phiên đăng nhập. Chạy npm run dev ở thư mục gốc.",
    );
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function readSession(
  token?: string,
  secret = process.env.AUTH_SESSION_SECRET,
): Session | null {
  if (!token || !secret || secret.length < 32) return null;
  try {
    const [body, signature, ...extra] = token.split(".");
    if (!body || !signature || extra.length) return null;
    const expected = createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof data.username === "string" &&
      typeof data.name === "string" &&
      ["teacher", "student"].includes(data.role) &&
      Number.isFinite(data.expires) &&
      data.expires > Date.now()
      ? data
      : null;
  } catch {
    return null;
  }
}
