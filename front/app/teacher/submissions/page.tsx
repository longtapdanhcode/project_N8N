import { connection } from "next/server";
import React, { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { TableLoadingSkeleton } from "@/components/table";
import { SubmissionsTableClient } from "./SubmissionsTableClient";
import { fetchSubmissions } from "@/lib/submissions";
import { getDashboardKPIs } from "@/lib/api";

export const instant = false;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sort?: string;
    order?: "asc" | "desc";
  }>;
}

async function SubmissionsDataContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sort?: string;
    order?: "asc" | "desc";
  }>;
}) {
  const searchParams = await searchParamsPromise;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.search || "";
  const status = searchParams.status || "";
  const sortBy = searchParams.sort || "createdAt";
  const sortOrder = searchParams.order || "desc";

  const result = await fetchSubmissions({
    page,
    pageSize: 20,
    search,
    status,
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-4">
      {/* Tiêu đề trang đã có ở DashboardShell; ở đây chỉ mô tả ngắn và tổng thật từ backend. */}
      <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--muted)]">
          Bài sinh viên nộp và nhận xét AI chấm theo tiêu chí. Điểm AI chỉ để tham khảo.
        </p>
        <p className="font-mono tabular-nums text-[var(--muted)]">
          Tổng <span className="text-[var(--text)]">{result.total}</span> bài nộp
        </p>
      </div>

      <SubmissionsTableClient
        initialData={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </div>
  );
}

export default async function SubmissionsPage(props: PageProps) {
  await connection();
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Quản lý Bài tập & Đánh giá AI"
      badgeCounts={{
        attendanceWarning: kpis.examProhibitedCount,
        thesisActive: kpis.totalTheses,
      }}
    >
      <Suspense fallback={<TableLoadingSkeleton rows={10} cols={6} />}>
        <SubmissionsDataContent searchParamsPromise={props.searchParams} />
      </Suspense>
    </DashboardShell>
  );
}
