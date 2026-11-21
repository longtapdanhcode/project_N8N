import type { Submission } from "@/types";

export type SubmissionTone = "done" | "pending" | "error";

/** Nhãn ngắn và sắc thái cho từng trạng thái chấm bài; đỏ chỉ dành cho lỗi. */
export function submissionStatus(status: Submission["status"]): {
  label: string;
  tone: SubmissionTone;
} {
  switch (status) {
    case "COMPLETED":
      return { label: "Đã chấm", tone: "done" };
    case "QUEUED":
    case "PENDING":
      return { label: "Đang chấm", tone: "pending" };
    case "QUEUE_FAILED":
      return { label: "Lỗi hàng đợi", tone: "error" };
    default:
      return { label: "Chấm lỗi", tone: "error" };
  }
}

/** Bộ lọc trạng thái; giá trị khớp danh sách backend chấp nhận. */
export const SUBMISSION_STATUS_FILTERS = [
  { label: "Đã chấm", value: "COMPLETED" },
  { label: "Đang chấm", value: "QUEUED" },
  { label: "Chấm lỗi", value: "FAILED" },
  { label: "Lỗi hàng đợi", value: "QUEUE_FAILED" },
];

export const NO_MODEL = "Chưa có";
