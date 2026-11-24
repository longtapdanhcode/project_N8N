'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AttendanceRecord, Student } from '@/types';
import { DataTable, DataTableToolbar } from '@/components/table';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { StudentDetailModal } from '@/components/dashboard/StudentDetailModal';
import { exportAttendanceToCSV } from '@/lib/export';
import { getStudentById } from '@/lib/api';
import { FileSearch, LoaderCircle } from 'lucide-react';

const ATTENDANCE_STATUS = {
  PROHIBITED: { label: 'Cấm thi', variant: 'danger' },
  WARNING: { label: 'Cảnh báo', variant: 'warning' },
  NORMAL: { label: 'Đủ điều kiện', variant: 'neutral' },
} as const;

interface AttendanceTableClientProps {
  initialData: AttendanceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  classList: string[];
}

export const AttendanceTableClient: React.FC<AttendanceTableClientProps> = ({
  initialData,
  total,
  page,
  pageSize,
  totalPages,
  classList,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleExport = () => {
    exportAttendanceToCSV(initialData);
    showToast(`Đã xuất ${initialData.length} bản ghi điểm danh của trang này ra tệp CSV.`);
  };

  // Bản ghi điểm danh không có đủ hồ sơ nên tải hồ sơ sinh viên khi mở.
  const handleSelectRecord = useCallback(
    async (record: AttendanceRecord) => {
      setLoadingId(record.id);
      try {
        const student = await getStudentById(record.studentId);
        if (student) setSelectedStudent(student);
        else showToast(`Không tải được hồ sơ của MSSV ${record.studentId}.`, 'error');
      } finally {
        setLoadingId(null);
      }
    },
    [showToast],
  );

  const columns = useMemo<ColumnDef<AttendanceRecord>[]>(
    () => [
      {
        id: 'subjectCode',
        accessorKey: 'subjectCode',
        header: 'Học phần',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium leading-snug text-[var(--text)]">{row.original.subjectName}</span>
            <span className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{row.original.subjectCode}</span>
          </div>
        ),
      },
      {
        id: 'studentName',
        accessorKey: 'studentName',
        header: 'Sinh viên / MSSV',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold leading-snug text-[var(--text)]">{row.original.studentName}</span>
            <span className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{row.original.studentId}</span>
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
        id: 'absentSessions',
        accessorKey: 'absentSessions',
        header: () => <div className="text-right">Tiết vắng</div>,
        cell: ({ row }) => {
          const { absentSessions, totalSessions, excusedAbsences } = row.original;
          return (
            <div className="text-right font-mono tabular-nums">
              <span className="text-xs text-[var(--text)]">
                {absentSessions}/{totalSessions}
              </span>
              {excusedAbsences > 0 && (
                <span className="block font-sans text-[11px] text-[var(--muted)]">{excusedAbsences} có phép</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'absenceRate',
        accessorKey: 'absenceRate',
        header: () => <div className="text-right">Tỷ lệ vắng</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs tabular-nums text-[var(--text)]">
            {Math.round(row.original.absenceRate * 100)}%
          </div>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Dự thi',
        cell: ({ row }) => {
          const st = ATTENDANCE_STATUS[row.original.status] ?? { label: row.original.status, variant: 'neutral' };
          return (
            <Badge variant={st.variant} size="sm">
              {st.label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Hồ sơ</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const loading = loadingId === row.original.id;
          return (
            <div className="text-right">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectRecord(row.original);
                }}
                disabled={loading}
                aria-label={`Xem hồ sơ ${row.original.studentName}`}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <FileSearch className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                <span>{loading ? 'Đang mở' : 'Xem hồ sơ'}</span>
              </button>
            </div>
          );
        },
      },
    ],
    [handleSelectRecord, loadingId]
  );

  return (
    <>
      {toast && <Toast message={toast.message} tone={toast.tone} />}

      <DataTableToolbar
        searchPlaceholder="Tìm theo MSSV, họ tên hoặc lớp"
        classList={classList}
        showClassFilter={true}
        showStatusFilter={true}
        statusOptions={[
          { label: 'Đủ điều kiện', value: 'NORMAL' },
          { label: 'Cảnh báo (vắng từ 15%)', value: 'WARNING' },
          { label: 'Cấm thi (vắng trên 20%)', value: 'PROHIBITED' },
        ]}
        onExport={handleExport}
        exportLabel="Xuất CSV điểm danh"
      />

      <DataTable
        columns={columns}
        data={initialData}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        emptyTitle="Không có bản ghi điểm danh phù hợp"
        emptyDescription="Thử bỏ từ khóa tìm kiếm hoặc chọn lớp, trạng thái khác."
        onRowClick={handleSelectRecord}
      />

      <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </>
  );
};
