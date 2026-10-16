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

  const completedCount = result.data.filter((s) => s.status === "COMPLETED").length;
  const evaluatedScores = result.data
    .filter((s) => s.status === "COMPLETED" && s.feedback?.score !== undefined)
    .map((s) => s.feedback!.score);
  const avgScore =
    evaluatedScores.length > 0
      ? (evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      {/* Header Metric Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Quản lý Bài tập & Đánh giá Tự động AI (n8n Workflow)
          </h2>
          <p className="text-slate-500 mt-0.5">
            Theo dõi danh sách bài nộp của sinh viên, xem điểm số và nhận xét chi tiết từng tiêu chí Rubric do AI đề xuất.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 tabular-nums">
            Tổng bài nộp: {result.total}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60 tabular-nums">
            Đã phân tích: {completedCount}
          </span>
          {evaluatedScores.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 tabular-nums">
              Điểm TB AI: {avgScore} / 10
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 tabular-nums">
            Hiển thị: {result.data.length} bài
          </span>
        </div>
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
