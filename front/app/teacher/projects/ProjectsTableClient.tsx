'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Thesis } from '@/types';
import { DataTable, DataTableToolbar } from '@/components/table';
import { Badge } from '@/components/ui/Badge';
import { ThesisDetailModal } from '@/components/dashboard/ThesisDetailModal';
import { Toast } from '@/components/ui/Toast';
import { exportThesesToCSV } from '@/lib/export';
import { DEFENSE_STATUS } from '@/lib/thesis-status';
import { FileSearch } from 'lucide-react';


interface ProjectsTableClientProps {
  initialData: Thesis[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ProjectsTableClient: React.FC<ProjectsTableClientProps> = ({
  initialData,
  total,
  page,
  pageSize,
  totalPages,
}) => {
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null);
  const [theses, setTheses] = useState<Thesis[]>(initialData);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset local rows when the server sends a new page (adjust state during render).
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setTheses(initialData);
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExport = () => {
    exportThesesToCSV(theses);
    showToast(`Đã xuất ${theses.length} đề tài của trang này ra tệp CSV.`);
  };

  const handleThesisUpdated = (updatedThesis: Thesis) => {
    setTheses((prev) =>
      prev.map((t) => (t._id === updatedThesis._id ? updatedThesis : t))
    );
    showToast(`Đã cập nhật mốc của đề tài "${updatedThesis.title}".`);
  };
  const columns = useMemo<ColumnDef<Thesis>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Đề tài',
        cell: ({ row }) => (
          <div className="flex min-w-0 max-w-md flex-col">
            <span className="font-semibold leading-snug text-[var(--text)]">{row.original.title}</span>
            {row.original.department && (
              <span className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{row.original.department}</span>
            )}
          </div>
        ),
      },
      {
        id: 'studentName',
        accessorKey: 'studentName',
        header: 'Sinh viên / MSSV',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium leading-snug text-[var(--text)]">
              {row.original.studentName || <span className="text-[var(--muted)]">Chưa có tên</span>}
            </span>
            <span className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{row.original.studentId}</span>
          </div>
        ),
      },
      {
        id: 'advisorName',
        accessorKey: 'advisorName',
        header: 'GVHD',
        cell: ({ row }) =>
          row.original.advisorName ? (
            <span className="text-[var(--text)]">{row.original.advisorName}</span>
          ) : (
            <span className="whitespace-nowrap text-[var(--muted)]">Chưa phân công</span>
          ),
      },
      {
        id: 'progressPercent',
        accessorKey: 'progressPercent',
        header: () => <div className="text-right">Tiến độ</div>,
        cell: ({ row }) => {
          const pct = Math.max(0, Math.min(100, row.original.progressPercent));
          const done = row.original.milestones.filter((m) => m.status === 'COMPLETED').length;
          return (
            <div className="flex flex-col items-end gap-1 tabular-nums">
              <span className="whitespace-nowrap font-mono text-xs text-[var(--text)]">
                {done}/{row.original.milestones.length} mốc · {pct}%
              </span>
              <div
                className="h-1 w-20 overflow-hidden rounded-full bg-[var(--border)]"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tiến độ đồ án"
              >
                <div className="h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        id: 'defenseStatus',
        accessorKey: 'defenseStatus',
        header: 'Bảo vệ',
        cell: ({ row }) => {
          const st = DEFENSE_STATUS[row.original.defenseStatus ?? 'NOT_ELIGIBLE'] ?? DEFENSE_STATUS.NOT_ELIGIBLE;
          return (
            <Badge variant={st.variant} size="sm">
              {st.label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Chi tiết</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedThesis(row.original);
              }}
              aria-label={`Xem các mốc của đề tài ${row.original.title}`}
              className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              <FileSearch className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Xem mốc</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <DataTableToolbar
        searchPlaceholder="Tìm theo đề tài, MSSV, sinh viên hoặc GVHD"
        showClassFilter={false}
        showStatusFilter={true}
        statusOptions={[
          { label: 'Đủ điều kiện bảo vệ', value: 'ELIGIBLE' },
          { label: 'Đang thực hiện', value: 'NOT_ELIGIBLE' },
        ]}
        onExport={handleExport}
        exportLabel="Xuất CSV đề tài"
      />

      <DataTable
        columns={columns}
        data={theses}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        emptyTitle="Không có đề tài phù hợp"
        emptyDescription="Thử bỏ từ khóa tìm kiếm hoặc chọn trạng thái khác."
        onRowClick={(thesis) => setSelectedThesis(thesis)}
      />

      <ThesisDetailModal
        thesis={selectedThesis}
        onClose={() => setSelectedThesis(null)}
        onThesisUpdated={handleThesisUpdated}
      />
    </>
  );
};
