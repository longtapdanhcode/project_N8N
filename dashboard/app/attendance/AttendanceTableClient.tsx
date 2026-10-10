'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AttendanceRecord, Student } from '@/types';
import { DataTable, DataTableToolbar } from '@/components/table';
import { Badge } from '@/components/ui/Badge';
import { StudentDetailModal } from '@/components/dashboard/StudentDetailModal';
import { exportAttendanceToCSV } from '@/lib/export';
import { getStudentById } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExport = () => {
    exportAttendanceToCSV(initialData);
    showToast(`Đã xuất ${initialData.length} bản ghi điểm danh ra file CSV!`);
  };

  const handleSelectRecord = async (record: AttendanceRecord) => {
    const student = await getStudentById(record.studentId);
    if (student) {
      setSelectedStudent(student);
    } else {
      showToast(`Không tìm thấy hồ sơ chi tiết cho MSSV ${record.studentId}`);
    }
  };

  const handleSendWarning = (student: Student) => {
    showToast(`Đã gửi cảnh báo n8n webhook cho ${student.fullName} (${student.studentId})!`);
  };
  const columns = useMemo<ColumnDef<AttendanceRecord>[]>(
    () => [
      {
        id: 'subjectCode',
        accessorKey: 'subjectCode',
        header: 'Mã môn',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900">
            {row.original.subjectCode}
          </span>
        ),
      },
      {
        id: 'subjectName',
        accessorKey: 'subjectName',
        header: 'Tên học phần',
        cell: ({ row }) => (
          <span className="font-medium text-slate-800">
            {row.original.subjectName}
          </span>
        ),
      },
      {
        id: 'studentId',
        accessorKey: 'studentId',
        header: 'MSSV',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-700">
            {row.original.studentId}
          </span>
        ),
      },
      {
        id: 'studentName',
        accessorKey: 'studentName',
        header: 'Họ và tên sinh viên',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900">
            {row.original.studentName}
          </span>
        ),
      },
      {
        id: 'classId',
        accessorKey: 'classId',
        header: 'Lớp',
        cell: ({ row }) => (
          <span className="font-mono text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-[11px]">
            {row.original.classId}
          </span>
        ),
      },
      {
        id: 'absentSessions',
        accessorKey: 'absentSessions',
        header: () => <div className="text-right">Tiết vắng / Tổng</div>,
        cell: ({ row }) => {
          const { absentSessions, totalSessions, excusedAbsences } = row.original;
          return (
            <div className="text-right tabular-nums">
              <span className="font-bold text-slate-900">
                {absentSessions}/{totalSessions} tiết
              </span>
              {excusedAbsences > 0 && (
                <span className="block text-[10px] text-slate-400">
                  ({excusedAbsences} có phép)
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'absenceRate',
        accessorKey: 'absenceRate',
        header: () => <div className="text-right">Tỷ lệ vắng</div>,
        cell: ({ row }) => {
          const rate = row.original.absenceRate;
          const pct = Math.round(rate * 100);
          return (
            <div className="text-right tabular-nums">
              <span
                className={`font-bold text-xs ${
                  row.original.status === 'PROHIBITED'
                    ? 'text-rose-600'
                    : row.original.status === 'WARNING'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {pct}%
              </span>
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Kết luận dự thi (Điều 14)',
        cell: ({ row }) => {
          const st = row.original.status;
          return st === 'PROHIBITED' ? (
            <Badge variant="danger" dot size="sm">
              CẤM THI (ĐIỂM F)
            </Badge>
          ) : st === 'WARNING' ? (
            <Badge variant="warning" dot size="sm">
              CẢNH BÁO (≥ 15%)
            </Badge>
          ) : (
            <Badge variant="success" dot size="sm">
              ĐỦ ĐIỀU KIỆN
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Hồ sơ SV</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectRecord(row.original);
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

      <DataTableToolbar
        searchPlaceholder="Tìm theo mã môn, tên môn, MSSV, họ tên..."
        classList={classList}
        showClassFilter={true}
        showStatusFilter={true}
        statusOptions={[
          { label: 'Đủ điều kiện', value: 'NORMAL' },
          { label: 'Cảnh báo (≥ 15%)', value: 'WARNING' },
          { label: 'Cấm thi (> 20%)', value: 'PROHIBITED' },
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
        emptyTitle="Không tìm thấy bản ghi điểm danh nào"
        emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc lọc theo lớp/trạng thái khác."
        onRowClick={handleSelectRecord}
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onSendWarning={handleSendWarning}
      />
    </>
  );
};
