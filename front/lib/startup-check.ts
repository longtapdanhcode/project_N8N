import { sessionSecretProblem } from "./session";

/** Cùng quy tắc với backend (portal-key.guard.ts): ít nhất 32 ký tự, không phải chuỗi lặp. */
export function portalKeyProblem(key: string | undefined) {
  if (!key) return "Chưa đặt PORTAL_API_KEY.";
  if (key.length < 32) return "PORTAL_API_KEY phải có ít nhất 32 ký tự.";
  if (new Set(key).size < 10)
    return "PORTAL_API_KEY quá dễ đoán; hãy dùng chuỗi ngẫu nhiên.";
  return null;
}

/**
 * Production phải có:
 * - khóa phiên cố định: khóa tạm sinh ngẫu nhiên sẽ đăng xuất mọi người mỗi lần
 *   khởi động lại, và mỗi máy chủ sẽ có một khóa khác nhau;
 * - khóa cổng giống backend: thiếu thì backend từ chối mọi request của cổng.
 * Ném lỗi thì Next vẫn chạy và trả 500 cho mọi request, nên thoát hẳn cho dễ thấy.
 */
export function checkProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  const problems = [
    sessionSecretProblem(process.env.AUTH_SESSION_SECRET),
    portalKeyProblem(process.env.PORTAL_API_KEY?.trim()),
  ].filter(Boolean);
  if (!problems.length) return;
  console.error(
    `${problems.join(" ")} Tạo khóa ngẫu nhiên bằng openssl rand -hex 48 và đặt trong front/.env.production.local hoặc biến môi trường trước khi chạy production. PORTAL_API_KEY phải giống hệt giá trị trong backend/.env.`,
  );
  process.exit(1);
}
