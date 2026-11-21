import { sessionSecretProblem } from "./session";

/**
 * Production phải có khóa phiên cố định: khóa tạm sinh ngẫu nhiên sẽ đăng xuất
 * mọi người mỗi lần khởi động lại, và mỗi máy chủ sẽ có một khóa khác nhau.
 * Ném lỗi thì Next vẫn chạy và trả 500 cho mọi request, nên thoát hẳn cho dễ thấy.
 */
export function checkSessionSecret() {
  if (process.env.NODE_ENV !== "production") return;
  const problem = sessionSecretProblem(process.env.AUTH_SESSION_SECRET);
  if (!problem) return;
  console.error(
    `${problem} Đặt khóa ngẫu nhiên cố định (ví dụ: openssl rand -hex 48) trong front/.env.production.local hoặc biến môi trường trước khi chạy production.`,
  );
  process.exit(1);
}
