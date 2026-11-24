import { connection } from "next/server";
import React, { Suspense } from 'react';
import { getStudents, getClassList } from '@/lib/api';
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
}: {
  searchParamsPromise: Promise<{
    page?: string;
    search?: string;
    classId?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
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
      {/* Tiêu đề trang đã có ở DashboardShell; ở đây chỉ mô tả ngắn và tổng thật từ backend. */}
      <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--muted)]">
          Hồ sơ sinh viên theo lớp sinh hoạt. Bấm một dòng để xem điểm, điểm danh và đồ án.
        </p>
        <p className="font-mono tabular-nums text-[var(--muted)]">
          Tổng <span className="text-[var(--text)]">{studentsResult.total}</span> sinh viên
        </p>
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

  return (
    <DashboardShell
      activeTitle="Sinh viên"
    >
      <Suspense fallback={<TableLoadingSkeleton rows={12} cols={6} />}>
        <StudentsDataContent searchParamsPromise={props.searchParams} />
      </Suspense>
    </DashboardShell>
  );
}
