"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  BookOpenCheck,
  ClipboardList,
  Files,
  Settings,
} from "lucide-react";
const tabs = [
  ["/teacher", "Tổng quan", LayoutDashboard],
  ["/teacher/students", "Sinh viên", Users],
  ["/teacher/attendance", "Điểm danh", CalendarCheck2],
  ["/teacher/projects", "Đồ án", BookOpenCheck],
  ["/teacher/submissions", "Bài tập", ClipboardList],
  ["/teacher/documents", "Tài liệu", Files],
  ["/teacher/settings", "Cài đặt", Settings],
] as const;
export function DashboardShell({
  children,
  activeTitle,
}: {
  children: ReactNode;
  activeTitle: string;
  badgeCounts?: { attendanceWarning?: number; thesisActive?: number };
}) {
  const path = usePathname();
  const [error, setError] = useState("");
  return (
    <div className="teacher-portal">
      <header className="portal-header">
        <Link className="portal-brand" href="/teacher">
          VKU <span>Giảng viên</span>
        </Link>
        <div className="portal-actions">
          <span className="portal-muted">Cổng giảng viên</span>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/session", { method: "DELETE" });
                if (!res.ok) throw new Error();
                window.location.assign("/");
              } catch {
                setError("Chưa đăng xuất được. Vui lòng thử lại.");
              }
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <h1>{activeTitle}</h1>
            <p className="portal-muted">Quản lý học tập và hỗ trợ sinh viên</p>
          </div>
          <span className="portal-muted">Học kỳ I · 2026–2027</span>
        </div>
        <nav className="portal-tabs" aria-label="Chức năng giảng viên">
          {tabs.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
        {error && (
          <p role="alert" className="service-error">
            {error}
          </p>
        )}
        {children}
        <footer className="portal-footer">
          <span>VKU · Cổng giảng viên</span>
          <span>
            {process.env.NEXT_PUBLIC_PORTAL_MOCK === "true"
              ? "Dữ liệu minh họa"
              : "Hệ thống đào tạo"}
          </span>
        </footer>
      </main>
    </div>
  );
}
