import { connection } from "next/server";
import React, { Suspense } from 'react';
import { getTheses, getDashboardKPIs } from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TableLoadingSkeleton } from '@/components/table';
import { ProjectsTableClient } from './ProjectsTableClient';

export const instant = false;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

async function ProjectsDataContent({
  searchParamsPromise,
  kpis,
}: {
  searchParamsPromise: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
  kpis: {
    completedMilestonesRate: number;
    totalTheses: number;
  };
}) {
  const searchParams = await searchParamsPromise;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.search || '';
  const defenseStatus = searchParams.status || '';
  const sortBy = searchParams.sort || '';
  const sortOrder = searchParams.order || 'asc';

  const thesesResult = await getTheses({
    page,
    pageSize: 20,
    search,
    defenseStatus,
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Quản lý Tiến độ Đồ án Tốt nghiệp (TanStack Table)
          </h2>
          <p className="text-slate-500 mt-0.5">
            Phân trang 20 đề tài/trang, theo dõi 4 cột mốc thẩm định và tỷ lệ đủ điều kiện bảo vệ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60 tabular-nums">
            Hoàn thành mốc: {kpis.completedMilestonesRate}%
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 tabular-nums">
            Tổng đồ án: {kpis.totalTheses}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 tabular-nums">
            Hiển thị: {thesesResult.total} đề tài
          </span>
        </div>
      </div>

      <ProjectsTableClient
        initialData={thesesResult.data}
        total={thesesResult.total}
        page={thesesResult.page}
        pageSize={thesesResult.pageSize}
        totalPages={thesesResult.totalPages}
      />
    </div>
  );
}

export default async function ProjectsPage(props: PageProps) {
  await connection();
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Quản lý Đề tài Đồ án Tốt nghiệp"
      badgeCounts={{
        attendanceWarning: kpis.examProhibitedCount,
        thesisActive: kpis.totalTheses,
      }}
    >
      <Suspense fallback={<TableLoadingSkeleton rows={12} cols={6} />}>
        <ProjectsDataContent searchParamsPromise={props.searchParams} kpis={kpis} />
      </Suspense>
    </DashboardShell>
  );
}
