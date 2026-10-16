import { connection } from "next/server";
import React, { Suspense } from 'react';
import { getStudents, getClassList, getDashboardKPIs } from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TableLoadingSkeleton } from '@/components/table';
import { StudentsTableClient } from './StudentsTableClient';

export const instant = false;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    classId?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

async function StudentsDataContent({
  searchParamsPromise,
  kpis,
}: {
  searchParamsPromise: Promise<{
    page?: string;
    search?: string;
    classId?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
  kpis: {
    activeStudents: number;
    averageGpa: number;
    totalStudents: number;
  };
}) {
  const searchParams = await searchParamsPromise;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.search || '';
  const classId = searchParams.classId || '';
  const sortBy = searchParams.sort || '';
  const sortOrder = searchParams.order || 'asc';

  const [studentsResult, classList] = await Promise.all([
    getStudents({
      page,
      pageSize: 20,
      search,
      classId,
      sortBy,
      sortOrder,
    }),
    getClassList(),
  ]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Quản lý Hồ sơ Sinh viên (Server-side TanStack Table)
          </h2>
          <p className="text-slate-500 mt-0.5">
            Phân trang 20 sinh viên/trang, sắp xếp và lọc được thực thi hoàn toàn trên server qua searchParams.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60 tabular-nums">
            Đang học: {kpis.activeStudents} SV
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 tabular-nums">
            GPA TB: {kpis.averageGpa.toFixed(2)}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 tabular-nums">
            Tổng: {studentsResult.total} sinh viên
          </span>
        </div>
      </div>

      <StudentsTableClient
        initialData={studentsResult.data}
        total={studentsResult.total}
        page={studentsResult.page}
        pageSize={studentsResult.pageSize}
        totalPages={studentsResult.totalPages}
        classList={classList}
      />
    </div>
  );
}

export default async function StudentsPage(props: PageProps) {
  await connection();
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Danh sách Sinh viên VKU"
      badgeCounts={{
        attendanceWarning: kpis.examProhibitedCount,
        thesisActive: kpis.totalTheses,
      }}
    >
      <Suspense fallback={<TableLoadingSkeleton rows={12} cols={6} />}>
        <StudentsDataContent searchParamsPromise={props.searchParams} kpis={kpis} />
      </Suspense>
    </DashboardShell>
  );
}
