"use client";

import React, { useEffect, useRef } from "react";
import type { Submission } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertTriangle, Lightbulb, Code2, Bot, Calendar, User, BookOpen } from "lucide-react";

interface SubmissionDetailModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export function SubmissionDetailModal({
  submission,
  onClose,
}: SubmissionDetailModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (submission) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [submission]);

  if (!submission) return null;

  const isCompleted = submission.status === "COMPLETED";
  const isFailed = submission.status === "FAILED" || submission.status === "QUEUE_FAILED";
  const isPending = submission.status === "PENDING" || submission.status === "QUEUED";

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

  return (
    <dialog
      ref={dialog}
      className="service-dialog text-xs"
      style={{
        width: "min(780px, calc(100vw - 32px))",
        maxHeight: "90vh",
        padding: "24px",
        overflowY: "auto",
      }}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="submission-modal-title"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div>
          <h2 id="submission-modal-title" className="text-sm font-bold text-slate-900">
            Chi tiết bài nộp & Đánh giá AI
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Mã bài nộp: <span className="font-mono">{submission._id}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
        >
          Đóng
        </button>
      </div>

      {/* Overview Info Card */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 mb-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">{submission.assignmentTitle}</h3>
          <div>
            {isCompleted ? (
              <Badge variant="success" dot size="md">
                ĐÃ PHÂN TÍCH
              </Badge>
            ) : isPending ? (
              <Badge variant="warning" dot size="md">
                ĐANG PHÂN TÍCH
              </Badge>
            ) : (
              <Badge variant="danger" dot size="md">
                THẤT BẠI
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">Sinh viên</span>
              <span className="font-semibold">{submission.studentName}</span>{" "}
              <span className="text-slate-500 font-mono">({submission.studentId})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">Môn học</span>
              <span className="font-semibold">{submission.courseName || "Lập trình Web"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">Thời gian nộp</span>
              <span className="font-medium">{formatDate(submission.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Bot className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">Model AI</span>
              <span className="font-mono font-medium text-slate-600">
                {submission.model || "gemini-3.5-flash-lite"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Evaluation Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            Kết quả Đánh giá Tự động từ AI (n8n Assignment Analyzed)
          </h4>
          {submission.feedback?.score !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Điểm AI đề xuất:</span>
              <span className="text-lg font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg tabular-nums">
                {submission.feedback.score} / 10
              </span>
            </div>
          )}
        </div>

        {isCompleted && submission.feedback ? (
          <div className="space-y-3.5 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
            {submission.feedback.summary && (
              <div>
                <strong className="text-xs text-slate-900 block mb-1">Tóm tắt đánh giá:</strong>
                <p className="text-xs text-slate-700 leading-relaxed prewrap">
                  {submission.feedback.summary}
                </p>
              </div>
            )}

            {/* Rubric Criteria */}
            {submission.criteria && submission.criteria.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <strong className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1.5">
                  Tiêu chí thẩm định (Rubric):
                </strong>
                <div className="flex flex-wrap gap-1.5">
                  {submission.criteria.map((c, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px]"
                    >
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {submission.feedback.strengths && submission.feedback.strengths.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <strong className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Điểm tốt / Đạt yêu cầu:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-xs">
                  {submission.feedback.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {submission.feedback.weaknesses && submission.feedback.weaknesses.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <strong className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Cần cải thiện / Hạn chế:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-xs">
                  {submission.feedback.weaknesses.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {submission.feedback.suggestions && submission.feedback.suggestions.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <strong className="text-xs font-semibold text-blue-800 flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                  Gợi ý nâng cao & phát triển:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-xs">
                  {submission.feedback.suggestions.map((sug, idx) => (
                    <li key={idx}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : isPending ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-900 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin flex-shrink-0" />
            <div>
              <strong className="block text-xs font-bold">Đang xử lý phân tích AI</strong>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Workflow n8n đang phân tích nội dung và đối chiếu tiêu chí Rubric với Gemini AI.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <strong className="block text-xs font-bold">Chưa thể tạo đánh giá AI</strong>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Bài nộp gặp lỗi trong quá trình xử lý hoặc nội dung chưa đủ điều kiện để mô hình phân tích.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submitted Content Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-slate-600" />
          Nội dung bài nộp của sinh viên
        </h4>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-72">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {submission.content || "(Bài nộp không có nội dung văn bản)"}
          </pre>
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
        >
          Đóng chi tiết
        </button>
      </div>
    </dialog>
  );
}
