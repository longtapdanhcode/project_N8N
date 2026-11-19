import type { PaginatedResult, Submission } from "@/types";
import { BACKEND_URL } from "./backend";

const SORT_COLUMNS: Record<string, string> = {
  student: "studentId",
  studentId: "studentId",
  assignmentTitle: "assignmentTitle",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  status: "status",
  score: "score",
};

interface BackendSubmission {
  _id: string;
  submissionId: string;
  studentId: string;
  studentName: string | null;
  assignmentTitle: string;
  content: string;
  criteria: string[];
  status: Submission["status"];
  model: string | null;
  feedback: {
    summary: string;
    score: number | null;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Danh sách bài nộp cho trang giảng viên, đọc qua backend GET /submissions.
 * Chỉ gọi phía server (Server Component hoặc route đã kiểm tra phiên giảng viên).
 */
export async function fetchSubmissions(
  options: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<PaginatedResult<Submission>> {
  const params = new URLSearchParams();
  const { sortBy, ...rest } = options;
  for (const [key, value] of Object.entries(rest))
    if (value !== undefined && value !== "") params.set(key, String(value));
  // Id cột trên bảng → trường backend cho phép sắp xếp; cột khác dùng mặc định createdAt.
  const sortField = sortBy && SORT_COLUMNS[sortBy];
  if (sortField) params.set("sortBy", sortField);

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/submissions?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Không kết nối được backend để tải danh sách bài nộp.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(body?.data)) {
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message || "Không tải được danh sách bài nộp.");
  }

  return {
    ...body,
    data: (body.data as BackendSubmission[]).map((doc) => ({
      _id: doc._id,
      submissionId: doc.submissionId,
      studentId: doc.studentId,
      studentName: doc.studentName ?? "Chưa có họ tên",
      assignmentTitle: doc.assignmentTitle,
      content: doc.content,
      criteria: doc.criteria,
      status: doc.status,
      model: doc.model ?? undefined,
      feedback: doc.feedback
        ? {
            summary: doc.feedback.summary,
            score: doc.feedback.score ?? undefined,
            strengths: doc.feedback.strengths,
            weaknesses: doc.feedback.weaknesses,
            suggestions: doc.feedback.suggestions,
          }
        : undefined,
      createdAt: doc.createdAt ?? "",
      updatedAt: doc.updatedAt ?? "",
    })),
  };
}
