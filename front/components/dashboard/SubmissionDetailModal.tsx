"use client";

import React, { useEffect, useRef } from "react";
import type { Submission } from "@/types";
import { SubmissionStatusBadge } from "@/components/dashboard/SubmissionStatusBadge";
import { NO_MODEL } from "@/lib/submission-status";
import { CircleCheck, CircleDashed, Lightbulb, LoaderCircle, TriangleAlert, X } from "lucide-react";

interface SubmissionDetailModalProps {
  submission: Submission | null;
  onClose: () => void;
}

const formatDate = (isoStr?: string) => {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  return Number.isNaN(date.getTime())
    ? isoStr
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const ICON = { className: "h-4 w-4 flex-shrink-0", strokeWidth: 1.5 } as const;

function FeedbackList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items?: string[];
}) {
  if (!items?.length) return null;
  return (
    <section className="border-t border-[var(--border)] pt-4">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
        {icon}
        {title}
      </h4>
      <ul className="list-disc space-y-1 pl-5 leading-relaxed text-[var(--text)]">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function SubmissionDetailModal({ submission, onClose }: SubmissionDetailModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (submission) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [submission]);

  if (!submission) return null;

  const { status, feedback } = submission;
  const isCompleted = status === "COMPLETED";
  const isPending = status === "PENDING" || status === "QUEUED";
  const meta: { label: string; value: React.ReactNode }[] = [
    {
      label: "Sinh viên",
      value: (
        <>
          {submission.studentName}{" "}
          <span className="font-mono text-[var(--muted)]">{submission.studentId}</span>
        </>
      ),
    },
    {
      label: "Môn học",
      value: submission.courseName || (
        <span className="text-[var(--muted)]">Chưa gắn môn</span>
      ),
    },
    {
      label: "Thời gian nộp",
      value: <span className="tabular-nums">{formatDate(submission.createdAt)}</span>,
    },
    {
      label: "Model AI",
      value: (
        <span className={`font-mono ${submission.model ? "" : "text-[var(--muted)]"}`}>
          {submission.model || NO_MODEL}
        </span>
      ),
    },
  ];

  return (
    <dialog
      ref={dialog}
      className="service-dialog text-xs text-[var(--text)]"
      style={{
        width: "min(760px, calc(100vw - 32px))",
        maxHeight: "90vh",
        padding: "24px",
        overflowY: "auto",
      }}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="submission-modal-title"
    >
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-[11px] tracking-wider text-[var(--muted)]">
            BÀI NỘP {submission._id}
          </p>
          <h2 id="submission-modal-title" className="text-base font-semibold leading-snug">
            {submission.assignmentTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
        >
          <X {...ICON} />
        </button>
      </header>

      <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {meta.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[11px] text-[var(--muted)]">{label}</dt>
            <dd className="mt-0.5 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-4 border-t border-[var(--border)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold">Nhận xét AI</h3>
          <div className="flex items-center gap-3">
            <SubmissionStatusBadge status={status} />
            {isCompleted && typeof feedback?.score === "number" && (
              <span className="font-mono text-sm font-semibold tabular-nums text-[var(--primary)]">
                {feedback.score}/10
              </span>
            )}
          </div>
        </div>

        {isCompleted && feedback ? (
          <>
            {feedback.summary && (
              <p className="whitespace-pre-wrap leading-relaxed">{feedback.summary}</p>
            )}
            {submission.criteria && submission.criteria.length > 0 && (
              <section className="border-t border-[var(--border)] pt-4">
                <h4 className="mb-2 text-xs font-semibold">Tiêu chí chấm</h4>
                <ul className="flex flex-wrap gap-2">
                  {submission.criteria.map((c, idx) => (
                    <li
                      key={idx}
                      className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <FeedbackList
              title="Điểm tốt"
              icon={<CircleCheck {...ICON} className={`${ICON.className} text-[var(--primary)]`} />}
              items={feedback.strengths}
            />
            <FeedbackList
              title="Cần cải thiện"
              icon={<CircleDashed {...ICON} className={`${ICON.className} text-[var(--muted)]`} />}
              items={feedback.weaknesses}
            />
            <FeedbackList
              title="Gợi ý"
              icon={<Lightbulb {...ICON} className={`${ICON.className} text-[var(--muted)]`} />}
              items={feedback.suggestions}
            />
            <p className="text-[11px] text-[var(--muted)]">
              Điểm và nhận xét do AI đề xuất, giảng viên cần xem lại trước khi dùng.
            </p>
          </>
        ) : isPending ? (
          <p className="flex items-center gap-2 text-[var(--muted)]" role="status">
            <LoaderCircle {...ICON} className={`${ICON.className} animate-spin`} />
            AI đang chấm bài này. Kết quả sẽ hiện khi workflow chạy xong; tải lại trang để cập nhật.
          </p>
        ) : (
          <p className="flex items-start gap-2 text-[var(--danger)]" role="alert">
            <TriangleAlert {...ICON} className={`${ICON.className} mt-px`} />
            {status === "QUEUE_FAILED"
              ? "Không đưa được bài vào hàng đợi chấm. Sinh viên có thể nộp lại."
              : "AI chưa chấm được bài này. Kiểm tra workflow n8n chấm bài rồi để sinh viên nộp lại."}
          </p>
        )}
      </section>

      <section className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-semibold">Nội dung bài nộp</h3>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs leading-relaxed">
          {submission.content || "(Bài nộp không có nội dung văn bản)"}
        </pre>
      </section>

      <footer className="mt-4 flex justify-end border-t border-[var(--border)] pt-4">
        <button
          onClick={onClose}
          className="min-h-10 rounded-md border border-[var(--border)] px-4 text-xs font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
        >
          Đóng
        </button>
      </footer>
    </dialog>
  );
}
