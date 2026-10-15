import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cp, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2] || "dev";
if (!["dev", "build", "start"].includes(mode))
  throw new Error("Chọn dev, build hoặc start.");
const env = {
  ...process.env,
  AUTH_SESSION_SECRET:
    process.env.AUTH_SESSION_SECRET || randomBytes(48).toString("hex"),
  DEMO_AUTH_ENABLED: "true",
  NEXT_PUBLIC_PORTAL_MOCK: process.env.NEXT_PUBLIC_PORTAL_MOCK || "false",
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
        VITE_USE_MOCK: process.env.VITE_USE_MOCK || "false",
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
