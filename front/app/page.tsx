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
              if (!res.ok) throw new Error(data.message || "Tài khoản hoặc mật khẩu không chính xác.");
              if (data.destination && data.destination.includes("/student")) {
                const cacheBuster = `?t=${Date.now()}`;
                const destination = (data.destination || "/student/index.html").replace(/\/index\.html.*$/, "/index.html") + cacheBuster;
                window.location.replace(destination);
              } else {
                window.location.replace(data.destination || "/teacher");
              }
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
              placeholder="MSSV hoặc tài khoản giảng viên (hoặc email)"
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
          <summary>Tài khoản kiểm thử thực từ Database (Mật khẩu: 123456)</summary>
          <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
            <div>
              <p style={{ margin: "4px 0", fontWeight: 600 }}>Sinh viên:</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{ fontSize: "12px", padding: "4px 8px", minHeight: "auto", background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--border)" }}
                  onClick={() => { setUsername("23IT143"); setPassword("123456"); setError(""); }}
                >
                  23IT143 (Lê Bảo Long)
                </button>
                <button
                  type="button"
                  style={{ fontSize: "12px", padding: "4px 8px", minHeight: "auto", background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--border)" }}
                  onClick={() => { setUsername("23IT003"); setPassword("123456"); setError(""); }}
                >
                  23IT003 (Hoàng Lê An)
                </button>
              </div>
            </div>
            <div>
              <p style={{ margin: "4px 0", fontWeight: 600 }}>Giảng viên:</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{ fontSize: "12px", padding: "4px 8px", minHeight: "auto", background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--border)" }}
                  onClick={() => { setUsername("gv.minh"); setPassword("123456"); setError(""); }}
                >
                  gv.minh (TS. Nguyễn Công Minh)
                </button>
                <button
                  type="button"
                  style={{ fontSize: "12px", padding: "4px 8px", minHeight: "auto", background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--border)" }}
                  onClick={() => { setUsername("gv.huy"); setPassword("123456"); setError(""); }}
                >
                  gv.huy (ThS. Trần Quốc Huy)
                </button>
              </div>
            </div>
            <p className="portal-muted" style={{ margin: "6px 0 0" }}>
              Xác thực trực tiếp từ Database MongoDB <code>vku-ai-support</code> qua Backend NestJS cổng 3001. Có thể đăng nhập bằng mã tài khoản hoặc email trường.
            </p>
          </div>
        </details>
      </div>
    </main>
  );
}
