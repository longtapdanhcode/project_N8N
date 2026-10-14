'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Student } from '@/types';
import { DataTable, DataTableToolbar } from '@/components/table';
import { Badge } from '@/components/ui/Badge';
import { StudentDetailModal } from '@/components/dashboard/StudentDetailModal';
import { exportStudentsToCSV } from '@/lib/export';
import { CheckCircle2 } from 'lucide-react';

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
    showToast(`Đã xuất ${initialData.length} sinh viên ra file CSV thành công!`);
  };

  const handleSendWarning = (student: Student) => {
    showToast(`Đã gửi cảnh báo Điều 14 tới n8n webhook cho ${student.fullName} (${student.studentId})!`);
  };

  // TanStack Table Column Definitions
  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: 'studentId',
        accessorKey: 'studentId',
        header: 'MSSV',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-900 tracking-tight">
            {row.original.studentId}
          </span>
        ),
      },
      {
        id: 'fullName',
        accessorKey: 'fullName',
        header: 'Họ và tên',
        cell: ({ row }) => {
          const initials = row.original.fullName
            .split(' ')
            .slice(-1)[0][0];
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-2xs flex-shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-800 truncate">
                  {row.original.fullName}
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  {row.original.email}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'classId',
        accessorKey: 'classId',
        header: 'Lớp sinh hoạt',
        cell: ({ row }) => (
          <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded text-[11px]">
            {row.original.classId}
          </span>
        ),
      },
      {
        id: 'attendanceRate',
        accessorKey: 'attendanceRate',
        header: () => <div className="text-right">Tỷ lệ điểm danh</div>,
        cell: ({ row }) => {
          const { attendanceRate, absentSessions, totalSessions, attendanceWarning, examProhibited } =
            row.original;
          const pct = Math.round(attendanceRate * 100);

          return (
            <div className="text-right tabular-nums">
              {examProhibited ? (
                <div className="inline-flex flex-col items-end">
                  <Badge variant="danger" dot size="sm">
                    Cấm thi ({absentSessions}/{totalSessions}t)
                  </Badge>
                  <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                    {pct}% có mặt
                  </span>
                </div>
              ) : attendanceWarning ? (
                <div className="inline-flex flex-col items-end">
                  <Badge variant="warning" dot size="sm">
                    Cảnh báo ({absentSessions}t vắng)
                  </Badge>
                  <span className="text-[10px] text-amber-600 font-bold mt-0.5">
                    {pct}% có mặt
                  </span>
                </div>
              ) : (
                <div className="inline-flex flex-col items-end">
                  <span className="font-bold text-slate-900 text-xs">{pct}%</span>
                  <span className="text-[10px] text-slate-400">
                    {absentSessions}/{totalSessions}t vắng
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'thesisProgress',
        accessorFn: (row) => (row.thesis ? row.thesis.progressPercent : -1),
        header: () => <div className="text-right">Trạng thái đồ án</div>,
        cell: ({ row }) => {
          const thesis = row.original.thesis;
          if (!thesis) {
            return (
              <div className="text-right tabular-nums">
                <span className="text-slate-400 text-xs">—</span>
              </div>
            );
          }

          const isEligible = thesis.defenseStatus === 'ELIGIBLE';

          return (
            <div className="text-right tabular-nums">
              <div className="inline-flex flex-col items-end">
                <span
                  className={`text-xs font-bold ${
                    isEligible ? 'text-emerald-600' : 'text-blue-600'
                  }`}
                >
                  {thesis.progressPercent}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {isEligible ? 'Đủ điều kiện BV' : 'Đang thực hiện'}
                </span>
              </div>
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
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Xem
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

      {/* Search and Filters Toolbar */}
      <DataTableToolbar
        searchPlaceholder="Tìm kiếm theo MSSV, Họ tên, Lớp học... (Debounced)"
        classList={classList}
        showClassFilter={true}
        onExport={handleExport}
        exportLabel="Xuất CSV sinh viên"
      />

      {/* TanStack Table */}
      <DataTable
        columns={columns}
        data={initialData}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        emptyTitle="Không tìm thấy sinh viên nào"
        emptyDescription="Không có sinh viên nào phù hợp với bộ lọc và từ khóa tìm kiếm trên server."
        onRowClick={(student) => setSelectedStudent(student)}
      />

      {/* Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onSendWarning={handleSendWarning}
      />
    </>
  );
};
