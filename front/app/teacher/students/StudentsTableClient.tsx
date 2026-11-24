'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Student } from '@/types';
import { DataTable, DataTableToolbar } from '@/components/table';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { StudentDetailModal, attendanceLabel } from '@/components/dashboard/StudentDetailModal';
import { exportStudentsToCSV } from '@/lib/export';
import { FileSearch } from 'lucide-react';

interface StudentsTableClientProps {
  initialData: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  classList: string[];
}

export const StudentsTableClient: React.FC<StudentsTableClientProps> = ({
  initialData,
  total,
  page,
  pageSize,
  totalPages,
  classList,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExport = () => {
    exportStudentsToCSV(initialData);
    showToast(`Đã xuất ${initialData.length} sinh viên của trang này ra tệp CSV.`);
  };

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: 'studentId',
        accessorKey: 'studentId',
        header: 'MSSV',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--text)]">{row.original.studentId}</span>
        ),
      },
      {
        id: 'fullName',
        accessorKey: 'fullName',
        header: 'Họ và tên',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold leading-snug text-[var(--text)]">
              {row.original.fullName}
            </span>
            <span className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{row.original.email}</span>
          </div>
        ),
      },
      {
        id: 'classId',
        accessorKey: 'classId',
        header: 'Lớp',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-[var(--muted)]">{row.original.classId}</span>
        ),
      },
      {
        id: 'attendanceRate',
        accessorKey: 'attendanceRate',
        header: () => <div className="text-right">Điểm danh</div>,
        cell: ({ row }) => {
          const { attendanceRate, absentSessions, totalSessions } = row.original;
          const state = attendanceLabel(row.original);
          return (
            <div className="flex flex-col items-end gap-1 tabular-nums">
              <span className="font-mono text-xs text-[var(--text)]">{Math.round(attendanceRate * 100)}% có mặt</span>
              <span className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                <span className="font-mono">
                  {absentSessions}/{totalSessions} tiết vắng
                </span>
                {state.variant !== 'neutral' && (
                  <Badge variant={state.variant} size="sm">
                    {state.label}
                  </Badge>
                )}
              </span>
            </div>
          );
        },
      },
      {
        id: 'thesisProgress',
        accessorFn: (row) => (row.thesis ? row.thesis.progressPercent : -1),
        header: () => <div className="text-right">Đồ án</div>,
        cell: ({ row }) => {
          const thesis = row.original.thesis;
          if (!thesis) {
            return <div className="text-right text-xs text-[var(--muted)]">Chưa có</div>;
          }
          return (
            <div className="flex flex-col items-end tabular-nums">
              <span className="font-mono text-xs text-[var(--text)]">{thesis.progressPercent}%</span>
              <span className="text-[11px] text-[var(--muted)]">
                {thesis.defenseStatus === 'ELIGIBLE'
                  ? 'Đủ điều kiện bảo vệ'
                  : thesis.defenseStatus === 'DEFENDED'
                    ? 'Đã bảo vệ'
                    : 'Đang thực hiện'}
              </span>
            </div>
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
                setSelectedStudent(row.original);
              }}
              aria-label={`Xem hồ sơ ${row.original.fullName}`}
              className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              <FileSearch className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Xem hồ sơ</span>
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
        searchPlaceholder="Tìm theo MSSV, họ tên, email hoặc lớp"
        classList={classList}
        showClassFilter={true}
        onExport={handleExport}
        exportLabel="Xuất CSV sinh viên"
      />

      <DataTable
        columns={columns}
        data={initialData}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        emptyTitle="Không có sinh viên phù hợp"
        emptyDescription="Thử bỏ từ khóa tìm kiếm hoặc chọn lớp khác."
        onRowClick={(student) => setSelectedStudent(student)}
      />

      <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </>
  );
};
