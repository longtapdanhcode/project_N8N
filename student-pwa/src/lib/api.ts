// All application HTTP calls live here, shared by the page and service worker.
import type { TimetableEntry, SyncItem } from "./db";
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);
export const apiUrl = (path: string) =>
  `${API_BASE}/${path.replace(/^\//, "")}`;

export interface Grade {
  course: string;
  credits: number;
  score: number;
}

export async function request<T>(
  url: string,
  init: RequestInit = {},
  timeout = 10_000,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    signal: init.signal ?? AbortSignal.timeout(timeout),
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(error.message)
        ? error.message.join(", ")
        : error.message || `Yêu cầu thất bại (${response.status})`,
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export const getGrades = async (studentId: string) =>
  USE_MOCK
    ? request<Grade[]>(apiUrl("grades/me"))
    : (
        await request<{
          grades: { subject: string; score: number; credits: number }[];
        }>(apiUrl(`students/${encodeURIComponent(studentId)}`))
      ).grades.map((g) => ({ ...g, course: g.subject }));
export const getTimetable = () =>
  request<TimetableEntry[]>(apiUrl("timetable"));

export const sendMutation = async (item: SyncItem) => {
  const result = await request<{
    success?: boolean;
    ack_token?: string;
    message?: string;
  }>(item.url, {
    method: item.method,
    headers: { "Idempotency-Key": item.id },
    body: JSON.stringify(item.body),
  });
  if (
    result?.success === false ||
    (item.url.endsWith("/attendance/offline-sync") && !result?.ack_token)
  )
    throw new Error(
      result?.message || "Chưa nhận được xác nhận đồng bộ từ máy chủ.",
    );
  return result;
};

export interface Course {
  id: string;
  course_name: string;
  prerequisite_course_id?: string;
}
export interface ClassSection {
  id: string;
  course_id: string;
  course_name: string;
  max_capacity: number;
  current_enrolled: number;
  schedule_day: number;
  start_period: number;
  end_period: number;
}
export interface Profile {
  studentId: string;
  email: string;
  semester: string;
}
export interface Feedback {
  summary: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}
export interface SubmissionResult {
  submissionId: string;
  status: string;
  feedback?: Feedback;
}
export interface SubmissionReceipt extends SubmissionResult {
  readToken: string;
  title: string;
  studentId: string;
}
export const getCourses = () => request<Course[]>(apiUrl("courses"));
export const getSections = () =>
  request<ClassSection[]>(apiUrl("class-sections"));
export async function registerCourse(profile: Profile, section: ClassSection) {
  const result = await request<{
    success?: boolean;
    message?: string;
    status?: string;
  }>(
    apiUrl("course-registration/register"),
    {
      method: "POST",
      body: JSON.stringify({
        student_id: profile.studentId,
        student_email: profile.email,
        semester: profile.semester,
        course_id: section.course_id,
        class_section_id: section.id,
      }),
    },
    60_000,
  );
  if (result.success === false)
    throw new Error(result.message || "Đăng ký chưa thành công.");
  return result;
}
export const askFAQ = (question: string, studentId: string) =>
  request<{
    answer: string;
    sources?: { id: string; title: string }[];
    needsEscalation?: boolean;
  }>(
    apiUrl("faq/ask"),
    { method: "POST", body: JSON.stringify({ question, studentId }) },
    130_000,
  );
export const submitAssignment = (body: {
  studentId: string;
  assignmentTitle: string;
  content: string;
  criteria: string[];
}) =>
  request<SubmissionReceipt>(
    apiUrl("submissions"),
    { method: "POST", body: JSON.stringify(body) },
    30_000,
  );
export const getSubmission = (receipt: SubmissionReceipt) =>
  request<SubmissionResult>(
    apiUrl(`submissions/${encodeURIComponent(receipt.submissionId)}`),
    { headers: { "x-submission-token": receipt.readToken } },
  );
export interface AttendanceRecord {
  class_section_id: string;
  session_date: string;
  status: string;
  device_timestamp: string;
}
export const getAttendanceHistory = (studentId: string) =>
  request<{ data: AttendanceRecord[] }>(
    apiUrl(
      `attendance/history?student_id=${encodeURIComponent(studentId)}&limit=50`,
    ),
  );
