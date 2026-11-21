"use client";

import React, { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Submission } from "@/types";
import { DataTable, DataTableToolbar } from "@/components/table";
import { SubmissionStatusBadge } from "@/components/dashboard/SubmissionStatusBadge";
import { SUBMISSION_STATUS_FILTERS } from "@/lib/submission-status";
import { SubmissionDetailModal } from "@/components/dashboard/SubmissionDetailModal";
import { exportSubmissionsToCSV } from "@/lib/export";
import { CheckCircle2, FileSearch } from "lucide-react";

interface SubmissionsTableClientProps {
  initialData: Submission[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const SubmissionsTableClient: React.FC<SubmissionsTableClientProps> = ({
  initialData,
  total,
  page,
  pageSize,
  totalPages,
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>(initialData);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset local rows when the server sends a new page (adjust state during render).
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setSubmissions(initialData);
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExport = () => {
    exportSubmissionsToCSV(submissions);
    showToast(`Đã xuất ${submissions.length} bài nộp của trang này ra tệp CSV.`);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const columns = useMemo<ColumnDef<Submission>[]>(
    () => [
      {
        id: "student",
        header: "Sinh viên / MSSV",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[var(--text)] leading-snug">
              {row.original.studentName}
            </span>
            <span className="font-mono text-xs text-[var(--muted)] mt-0.5">
              {row.original.studentId}
            </span>
          </div>
        ),
      },
      {
        id: "courseName",
        accessorKey: "courseName",
        header: "Môn học",
        // Bài nộp chưa lưu môn học: không đoán, không cho sắp xếp theo cột này.
        enableSorting: false,
        cell: ({ row }) => (
          row.original.courseName ? (
            <span className="font-medium text-[var(--text)]">{row.original.courseName}</span>
          ) : (
            <span className="whitespace-nowrap text-[var(--muted)]">Chưa gắn môn</span>
          )
        ),
      },
      {
        id: "assignmentTitle",
        accessorKey: "assignmentTitle",
        header: "Tiêu đề bài nộp",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0 max-w-sm">
            <span className="font-semibold text-[var(--text)] leading-snug">
              {row.original.assignmentTitle}
            </span>
            {row.original.criteria && row.original.criteria.length > 0 && (
              <span className="text-[11px] text-[var(--muted)] mt-0.5">
                {row.original.criteria.length} tiêu chí Rubric
              </span>
            )}
          </div>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Thời gian nộp",
        cell: ({ row }) => (
          <span className="text-[var(--muted)] text-xs tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Trạng thái AI",
        cell: ({ row }) => {
          const score = row.original.feedback?.score;
          return (
            <div className="flex items-center gap-2">
              <SubmissionStatusBadge status={row.original.status} />
              {row.original.status === "COMPLETED" && typeof score === "number" && (
                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--primary)]">
                  {score}/10
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Chi tiết</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSubmission(row.original);
              }}
              aria-label={`Xem chi tiết bài nộp của ${row.original.studentName || row.original.studentId}`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)] cursor-pointer"
            >
              <FileSearch className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Xem chi tiết</span>
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
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text)]"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--primary)]" strokeWidth={1.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      <DataTableToolbar
        searchPlaceholder="Tìm theo tiêu đề bài, họ tên hoặc MSSV"
        showClassFilter={false}
        showStatusFilter={true}
        statusOptions={SUBMISSION_STATUS_FILTERS}
        onExport={handleExport}
        exportLabel="Xuất CSV bài nộp"
      />

      <DataTable
        columns={columns}
        data={submissions}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        emptyTitle="Chưa có bài nộp nào"
        emptyDescription="Sinh viên nộp bài trong cổng sinh viên; bài mới sẽ hiện ở đây. Nếu đang lọc, thử bỏ từ khóa hoặc chọn trạng thái khác."
        onRowClick={(sub) => setSelectedSubmission(sub)}
      />

      {/* Submission Detail Modal */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </>
  );
};
