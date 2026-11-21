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

/**
 * Lý do khóa phiên không dùng được, hoặc null nếu hợp lệ.
 * Chặn cả khóa quá ngắn lẫn chuỗi lặp kiểu "aaaa…" hay "1234…".
 */
export function sessionSecretProblem(secret: string | undefined) {
  if (!secret) return "Chưa đặt AUTH_SESSION_SECRET.";
  if (secret.length < 32)
    return "AUTH_SESSION_SECRET phải có ít nhất 32 ký tự.";
  if (new Set(secret).size < 10)
    return "AUTH_SESSION_SECRET quá dễ đoán; hãy dùng chuỗi ngẫu nhiên.";
  return null;
}

export function signSession(
  session: Session,
  secret = process.env.AUTH_SESSION_SECRET,
): string {
  const problem = sessionSecretProblem(secret);
  if (problem) throw new Error(`Chưa cấu hình phiên đăng nhập. ${problem}`);
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${createHmac("sha256", secret!).update(body).digest("base64url")}`;
}

export function readSession(
  token?: string,
  secret = process.env.AUTH_SESSION_SECRET,
): Session | null {
  if (!token || sessionSecretProblem(secret)) return null;
  try {
    const [body, signature, ...extra] = token.split(".");
    if (!body || !signature || extra.length) return null;
    const expected = createHmac("sha256", secret!).update(body).digest();
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
