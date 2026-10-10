'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Thesis } from '@/types';
import { DataTable, DataTableToolbar } from '@/components/table';
import { Badge } from '@/components/ui/Badge';
import { ThesisDetailModal } from '@/components/dashboard/ThesisDetailModal';
import { exportThesesToCSV } from '@/lib/export';
import { CheckCircle2 } from 'lucide-react';

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

  React.useEffect(() => {
    setTheses(initialData);
  }, [initialData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExport = () => {
    exportThesesToCSV(theses);
    showToast(`Đã xuất ${theses.length} đề tài đồ án ra file CSV!`);
  };

  const handleThesisUpdated = (updatedThesis: Thesis) => {
    setTheses((prev) =>
      prev.map((t) => (t._id === updatedThesis._id ? updatedThesis : t))
    );
    showToast(`Đã cập nhật tiến độ đề tài "${updatedThesis.title}" thành công!`);
  };
  const columns = useMemo<ColumnDef<Thesis>[]>(
    () => [
      {
        id: 'studentId',
        accessorKey: 'studentId',
        header: 'MSSV',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900">
            {row.original.studentId}
          </span>
        ),
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Tên đề tài đồ án',
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0 max-w-md">
            <span className="font-semibold text-slate-900 leading-snug">
              {row.original.title}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 truncate">
              {row.original.department}
            </span>
          </div>
        ),
      },
      {
        id: 'studentName',
        accessorKey: 'studentName',
        header: 'Sinh viên thực hiện',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-800">
            {row.original.studentName}
          </span>
        ),
      },
      {
        id: 'advisorName',
        accessorKey: 'advisorName',
        header: 'GVHD',
        cell: ({ row }) => (
          <span className="text-slate-700 font-medium">
            {row.original.advisorName}
          </span>
        ),
      },
      {
        id: 'progressPercent',
        accessorKey: 'progressPercent',
        header: () => <div className="text-right">Tiến độ hoàn thành</div>,
        cell: ({ row }) => {
          const pct = row.original.progressPercent;
          return (
            <div className="text-right tabular-nums">
              <span className="font-bold text-blue-600 text-xs">{pct}%</span>
              <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden ml-auto mt-1">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: 'defenseStatus',
        accessorKey: 'defenseStatus',
        header: 'Thẩm định bảo vệ',
        cell: ({ row }) => {
          const isEligible = row.original.defenseStatus === 'ELIGIBLE';
          return (
            <Badge variant={isEligible ? 'success' : 'neutral'} dot size="sm">
              {isEligible ? 'ĐỦ ĐIỀU KIỆN BV' : 'ĐANG THỰC HIỆN'}
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
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Xem mốc
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <DataTableToolbar
        searchPlaceholder="Tìm theo tên đề tài, MSSV, sinh viên, GVHD..."
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
        emptyTitle="Không tìm thấy đề tài nào"
        emptyDescription="Thử thay đổi từ khóa tìm kiếm đề tài hoặc người hướng dẫn."
        onRowClick={(thesis) => setSelectedThesis(thesis)}
      />

      {/* Thesis Detail Modal */}
      <ThesisDetailModal
        thesis={selectedThesis}
        onClose={() => setSelectedThesis(null)}
        onThesisUpdated={handleThesisUpdated}
      />
    </>
  );
};
