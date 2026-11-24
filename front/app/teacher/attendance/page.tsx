import { connection } from "next/server";
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
      {/* Tiêu đề trang đã có ở DashboardShell; ở đây chỉ mô tả ngắn và tổng thật từ backend. */}
      <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--muted)]">
          Theo Điều 14 quy chế: vắng từ 15% số tiết bị cảnh báo, vắng trên 20% bị cấm thi.
        </p>
        <p className="font-mono tabular-nums text-[var(--muted)]">
          <span className="text-[var(--danger)]">{kpis.examProhibitedCount} cấm thi</span>
          {" · "}
          <span className="text-[var(--warning)]">{kpis.attendanceWarningCount} cảnh báo</span>
          {" · "}
          Tổng <span className="text-[var(--text)]">{attendanceResult.total}</span> bản ghi
        </p>
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
  await connection();
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Điểm danh"
    >
      <Suspense fallback={<TableLoadingSkeleton rows={12} cols={7} />}>
        <AttendanceDataContent searchParamsPromise={props.searchParams} kpis={kpis} />
      </Suspense>
    </DashboardShell>
  );
}
