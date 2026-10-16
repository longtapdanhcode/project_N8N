import { useEffect, useState, type ReactNode } from "react";
import { portalSession } from "../lib/api";
export function PortalGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        if (!navigator.onLine) {
          // Offline UI access only; every online request still requires the server cookie.
          const saved = JSON.parse(
            sessionStorage.getItem("vku-offline-session") || "null",
          );
          if (saved?.role === "student" && saved.expires > Date.now()) {
            setReady(true);
            return;
          }
          throw new Error(
            "Kết nối mạng và đăng nhập trước khi dùng ngoại tuyến.",
          );
        }
        const { session } = await portalSession();
        if (session.role !== "student") {
          window.location.replace("/teacher");
          return;
        }
        sessionStorage.setItem("vku-offline-session", JSON.stringify(session));
        const profile =
          JSON.parse(localStorage.getItem("vku-profile") || "null") || {};
        const studentId = session.studentId || session.username;
        localStorage.setItem(
          "vku-profile",
          JSON.stringify({
            ...profile,
            studentId,
            email: session.email || (profile.studentId === studentId ? profile.email || "" : ""),
            semester: profile.semester || "2026-2027-1",
          }),
        );
        setReady(true);
      } catch {
        setError(
          "Chưa xác nhận được phiên đăng nhập. Hãy kết nối mạng và đăng nhập lại.",
        );
      }
    })();
  }, []);
  return ready ? (
    children
  ) : (
    <main>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <a href="/">Về trang đăng nhập</a>
        </>
      ) : (
        <p role="status">Đang xác nhận đăng nhập…</p>
      )}
    </main>
  );
}
