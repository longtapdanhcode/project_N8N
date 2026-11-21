import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cp, mkdir, access } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2] || "dev";
if (!["dev", "build", "start"].includes(mode))
  throw new Error("Chọn dev, build hoặc start.");

// Đọc front/.env* như Next sẽ đọc, để khóa đặt trong tệp không bị khóa tạm ghi đè.
const { loadEnvConfig } = createRequire(
  path.join(root, "front/package.json"),
)("@next/env");
loadEnvConfig(path.join(root, "front"), mode === "dev", {
  info: () => {},
  error: console.error,
});
// Kiểm tra đầy đủ (độ dài, độ ngẫu nhiên) nằm ở front/lib/session.ts;
// production còn bị front/instrumentation.ts chặn khi khởi động.
const secret = process.env.AUTH_SESSION_SECRET;
const problem = !secret
  ? "Chưa đặt AUTH_SESSION_SECRET."
  : secret.length < 32
    ? "AUTH_SESSION_SECRET phải có ít nhất 32 ký tự."
    : null;
if (problem && mode === "start") {
  console.error(
    `${problem}\nProduction cần khóa phiên cố định, ví dụ: openssl rand -hex 48\nĐặt AUTH_SESSION_SECRET trong front/.env.production.local hoặc biến môi trường rồi chạy lại.`,
  );
  process.exit(1);
}
if (problem && mode === "dev")
  console.warn(
    `${problem} Dùng khóa tạm cho lần chạy dev này; khởi động lại sẽ phải đăng nhập lại.`,
  );
const env = {
  ...process.env,
  // build không ký phiên; dev dùng khóa tạm khi chưa cấu hình.
  AUTH_SESSION_SECRET: problem ? randomBytes(48).toString("hex") : secret,
};
function run(file, args, cwd, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      cwd,
      env: { ...env, ...extra },
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Lệnh thất bại (${code})`)),
    );
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => child.kill(signal));
  });
}
try {
  if (mode !== "start") {
    await run(
      path.join(root, "student-pwa/node_modules/typescript/bin/tsc"),
      ["--noEmit"],
      path.join(root, "student-pwa"),
    );
    await run(
      path.join(root, "student-pwa/node_modules/vite/bin/vite.js"),
      ["build"],
      path.join(root, "student-pwa"),
      {
        VITE_BASE_PATH: "/student/",
        VITE_PORTAL: "true",
        VITE_API_URL: "/api/student-data",
        VITE_USE_MOCK: "false",
      },
    );
    await mkdir(path.join(root, "front/public/student"), { recursive: true });
    await cp(
      path.join(root, "student-pwa/dist"),
      path.join(root, "front/public/student"),
      { recursive: true },
    );
  } else await access(path.join(root, "front/public/student/index.html"));
  const args =
    mode === "build"
      ? ["build"]
      : [mode, "--port", "3000", "--hostname", "127.0.0.1"];
  await run(
    path.join(root, "front/node_modules/next/dist/bin/next"),
    args,
    path.join(root, "front"),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
