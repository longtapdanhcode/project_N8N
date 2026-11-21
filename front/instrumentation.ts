// Chạy một lần khi máy chủ Next khởi động.
export async function register() {
  // Chỉ máy chủ Node ký phiên; bản Edge không nạp phần kiểm tra này.
  if (process.env.NEXT_RUNTIME === "nodejs")
    (await import("./lib/startup-check")).checkProductionSecrets();
}
