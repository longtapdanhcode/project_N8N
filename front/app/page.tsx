"use client";
import { useState } from "react";
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <div className="login-panel">
        <p className="portal-brand">VKU · Hỗ trợ học tập</p>
        <h1>Đăng nhập</h1>
        <p className="portal-muted">Truy cập lớp học và công việc của bạn.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const res = await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message);
              window.location.assign(data.destination);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Không thể đăng nhập.");
              setBusy(false);
            }
          }}
        >
          <label>
            Tài khoản
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="MSSV hoặc tài khoản giảng viên"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="service-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy}>
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <details>
          <summary>Tài khoản thử nghiệm</summary>
          <p>
            Giảng viên: <code>gv.demo</code> / <code>DemoGV2026!</code>
          </p>
          <p>
            Sinh viên: <code>23IT112</code> / <code>DemoSV2026!</code>
          </p>
          <p className="portal-muted">
            Bản thử nghiệm. Vai trò được xác định từ tài khoản, chưa kết nối hệ
            thống xác thực của trường.
          </p>
        </details>
      </div>
    </main>
  );
}
