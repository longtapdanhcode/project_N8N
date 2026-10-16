"use client";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function TeacherError({ reset }: { reset: () => void }) {
  return (
    <DashboardShell activeTitle="Chưa tải được dữ liệu">
      <div className="service-page" role="alert">
        <p className="service-error">
          Không tải được dữ liệu. Vui lòng kiểm tra backend/database và thử lại.
        </p>
        <button onClick={reset}>Thử lại</button>
      </div>
    </DashboardShell>
  );
}
