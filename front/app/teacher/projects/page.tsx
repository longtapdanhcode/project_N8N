import { connection } from "next/server";
import React, { Suspense } from 'react';
import { getTheses } from '@/lib/api';
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
}: {
  searchParamsPromise: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
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
      {/* Tiêu đề trang đã có ở DashboardShell; ở đây chỉ mô tả ngắn và tổng thật từ backend. */}
      <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--muted)]">
          Đề tài tốt nghiệp và tiến độ theo mốc. Bấm một dòng để xem nhận xét AI và cập nhật mốc.
        </p>
        <p className="font-mono tabular-nums text-[var(--muted)]">
          Tổng <span className="text-[var(--text)]">{thesesResult.total}</span> đề tài
        </p>
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

  return (
    <DashboardShell
      activeTitle="Đồ án tốt nghiệp"
    >
      <Suspense fallback={<TableLoadingSkeleton rows={12} cols={6} />}>
        <ProjectsDataContent searchParamsPromise={props.searchParams} />
      </Suspense>
    </DashboardShell>
  );
}
