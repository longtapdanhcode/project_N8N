"use client";

import React, { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Submission } from "@/types";
import { DataTable, DataTableToolbar } from "@/components/table";
import { Badge } from "@/components/ui/Badge";
import { SubmissionDetailModal } from "@/components/dashboard/SubmissionDetailModal";
import { exportSubmissionsToCSV } from "@/lib/export";
import { CheckCircle2, Bot } from "lucide-react";

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

  React.useEffect(() => {
    setSubmissions(initialData);
  }, [initialData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExport = () => {
    exportSubmissionsToCSV(submissions);
    showToast(`Đã xuất ${submissions.length} bài nộp ra file CSV!`);
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
            <span className="font-semibold text-slate-900 leading-snug">
              {row.original.studentName}
            </span>
            <span className="font-mono text-xs text-slate-500 mt-0.5">
              {row.original.studentId}
            </span>
          </div>
        ),
      },
      {
        id: "courseName",
        accessorKey: "courseName",
        header: "Môn học",
        cell: ({ row }) => (
          <span className="font-medium text-slate-700">
            {row.original.courseName || "Lập trình Web"}
          </span>
        ),
      },
      {
        id: "assignmentTitle",
        accessorKey: "assignmentTitle",
        header: "Tiêu đề bài nộp",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0 max-w-sm">
            <span className="font-semibold text-slate-900 leading-snug">
              {row.original.assignmentTitle}
            </span>
            {row.original.criteria && row.original.criteria.length > 0 && (
              <span className="text-[11px] text-slate-400 mt-0.5">
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
          <span className="text-slate-600 text-xs tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Trạng thái AI",
        cell: ({ row }) => {
          const status = row.original.status;
          const score = row.original.feedback?.score;

          if (status === "COMPLETED") {
            return (
              <div className="flex items-center gap-2">
                <Badge variant="success" dot size="sm">
                  ĐÃ PHÂN TÍCH
                </Badge>
                {score !== undefined && (
                  <span className="font-bold text-blue-700 text-xs tabular-nums">
                    {score}/10
                  </span>
                )}
              </div>
            );
          }

          if (status === "QUEUED" || status === "PENDING") {
            return (
              <Badge variant="warning" dot size="sm">
                ĐANG PHÂN TÍCH
              </Badge>
            );
          }

          return (
            <Badge variant="danger" dot size="sm">
              THẤT BẠI
            </Badge>
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
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Xem đánh giá AI</span>
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
        searchPlaceholder="Tìm theo tên bài nộp, sinh viên, MSSV, môn học..."
        showClassFilter={false}
        showStatusFilter={true}
        statusOptions={[
          { label: "Đã phân tích", value: "COMPLETED" },
          { label: "Đang phân tích", value: "QUEUED" },
          { label: "Thất bại", value: "FAILED" },
        ]}
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
        emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác."
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
