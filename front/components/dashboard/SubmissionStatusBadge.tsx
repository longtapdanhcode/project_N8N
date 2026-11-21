import { submissionStatus } from "@/lib/submission-status";
import type { Submission } from "@/types";

const TONE_CLASS = {
  done: "border-[#25515c] bg-[var(--primary-soft)] text-[var(--primary)]",
  pending: "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]",
  error: "border-[#59323e] bg-[#301e28] text-[var(--danger)]",
};

/** Huy hiệu trạng thái: luôn có chữ, màu chỉ để nhận nhanh. */
export function SubmissionStatusBadge({ status }: { status: Submission["status"] }) {
  const { label, tone } = submissionStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
