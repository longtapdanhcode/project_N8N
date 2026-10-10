import React, { Suspense } from 'react';
import { getAttendanceRecords, getClassList, getDashboardKPIs } from '@/lib/api';
import { AttendanceStatus } from '@/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TableLoadingSkeleton } from '@/components/table';
import { AttendanceTableClient } from './AttendanceTableClient';

export const instant = false;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    classId?: string;
    status?: AttendanceStatus | 'ALL';
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

async function AttendanceDataContent({
  searchParamsPromise,
  kpis,
}: {
  searchParamsPromise: Promise<{
    page?: string;
    search?: string;
    classId?: string;
    status?: AttendanceStatus | 'ALL';
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
  kpis: {
    examProhibitedCount: number;
    attendanceWarningCount: number;
    totalStudents: number;
  };
}) {
  const searchParams = await searchParamsPromise;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.search || '';
  const classId = searchParams.classId || '';
  const status = searchParams.status || 'ALL';
  const sortBy = searchParams.sort || '';
  const sortOrder = searchParams.order || 'asc';

  const [attendanceResult, classList] = await Promise.all([
    getAttendanceRecords({
      page,
      pageSize: 20,
      search,
      classId,
      status,
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
            Giám sát Điểm danh Sinh viên (Quy chế VKU Điều 14)
          </h2>
          <p className="text-slate-500 mt-0.5">
            Phân trang 20 bản ghi/trang, tự động phát hiện sinh viên vắng $\ge 15\%$ và cấm thi khi vắng &gt; 20%.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200/60 tabular-nums">
            Cấm thi: {kpis.examProhibitedCount} SV
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200/60 tabular-nums">
            Cảnh báo: {kpis.attendanceWarningCount} SV
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 tabular-nums">
            Tổng: {attendanceResult.total} bản ghi
          </span>
        </div>
      </div>

      <AttendanceTableClient
        initialData={attendanceResult.data}
        total={attendanceResult.total}
        page={attendanceResult.page}
        pageSize={attendanceResult.pageSize}
        totalPages={attendanceResult.totalPages}
        classList={classList}
      />
    </div>
  );
}

export default async function AttendancePage(props: PageProps) {
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Theo dõi Điểm danh Học phần"
      badgeCounts={{
        attendanceWarning: kpis.examProhibitedCount,
        thesisActive: kpis.totalTheses,
      }}
    >
      <Suspense fallback={<TableLoadingSkeleton rows={12} cols={7} />}>
        <AttendanceDataContent searchParamsPromise={props.searchParams} kpis={kpis} />
      </Suspense>
    </DashboardShell>
  );
}
