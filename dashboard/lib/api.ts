import { 
  Student, 
  AttendanceRecord, 
  Thesis, 
  DashboardKPIs, 
  PaginatedResult, 
  FilterOptions, 
  MilestoneStatus,
  AttendanceStatus 
} from '@/types';
import { 
  MOCK_STUDENTS, 
  MOCK_ATTENDANCE_RECORDS, 
  MOCK_THESES, 
  calculateDashboardKPIs 
} from './mock';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// In-memory mutable copies for interactive demo changes
let currentStudents = [...MOCK_STUDENTS];
let currentAttendance = [...MOCK_ATTENDANCE_RECORDS];
let currentTheses = [...MOCK_THESES];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch paginated, filtered, and searched students
 */
export async function getStudents(options: FilterOptions = {}): Promise<PaginatedResult<Student>> {
  await delay(60);
  const {
    search = '',
    major = '',
    classId = '',
    status = '',
    attendanceWarningOnly = false,
    page = 1,
    pageSize = 20,
    sortBy = '',
    sortOrder = 'asc',
  } = options;

  let filtered = currentStudents;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.studentId.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.classId.toLowerCase().includes(q)
    );
  }

  if (major) {
    filtered = filtered.filter((s) => s.major === major || s.major.includes(major));
  }

  if (classId) {
    filtered = filtered.filter((s) => s.classId === classId);
  }

  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }

  if (attendanceWarningOnly) {
    filtered = filtered.filter((s) => s.attendanceWarning || s.examProhibited);
  }

  if (sortBy) {
    filtered = [...filtered].sort((a, b) => {
      let valA: any = (a as any)[sortBy];
      let valB: any = (b as any)[sortBy];

      if (sortBy === 'thesisProgress') {
        valA = a.thesis ? a.thesis.progressPercent : -1;
        valB = b.thesis ? b.thesis.progressPercent : -1;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'desc'
          ? valB.localeCompare(valA, 'vi')
          : valA.localeCompare(valB, 'vi');
      }

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      return sortOrder === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const pagedData = filtered.slice(startIndex, startIndex + pageSize);

  return {
    data: pagedData,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch list of unique class IDs
 */
export async function getClassList(): Promise<string[]> {
  await delay(10);
  return Array.from(new Set(currentStudents.map((s) => s.classId))).sort();
}

/**
 * Fetch top students violating attendance (>20% or highest absence rate)
 */
export async function getTopAttendanceViolators(limit = 5): Promise<Student[]> {
  await delay(20);
  return currentStudents
    .filter((s) => s.examProhibited)
    .sort((a, b) => b.absentSessions - a.absentSessions)
    .slice(0, limit);
}

/**
 * Fetch a single student by ID
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  await delay(40);
  const found = currentStudents.find(
    (s) => s.studentId.toLowerCase() === studentId.toLowerCase() || s.id === studentId
  );
  return found || null;
}

/**
 * Fetch attendance records with filtering and pagination
 */
export async function getAttendanceRecords(options: {
  search?: string;
  status?: AttendanceStatus | 'ALL';
  classId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResult<AttendanceRecord>> {
  await delay(60);
  const {
    search = '',
    status = 'ALL',
    classId = '',
    page = 1,
    pageSize = 20,
    sortBy = '',
    sortOrder = 'asc',
  } = options;

  let filtered = currentAttendance;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.studentId.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q) ||
        r.subjectCode.toLowerCase().includes(q)
    );
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === status);
  }

  if (classId) {
    filtered = filtered.filter((r) => r.classId === classId);
  }

  if (sortBy) {
    filtered = [...filtered].sort((a, b) => {
      let valA: any = (a as any)[sortBy];
      let valB: any = (b as any)[sortBy];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'desc'
          ? valB.localeCompare(valA, 'vi')
          : valA.localeCompare(valB, 'vi');
      }

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      return sortOrder === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const pagedData = filtered.slice(startIndex, startIndex + pageSize);

  return {
    data: pagedData,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch theses with filtering and pagination
 */
export async function getTheses(options: {
  search?: string;
  advisorId?: string;
  defenseStatus?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResult<Thesis>> {
  await delay(60);
  const {
    search = '',
    advisorId = '',
    defenseStatus = '',
    page = 1,
    pageSize = 20,
    sortBy = '',
    sortOrder = 'asc',
  } = options;

  let filtered = currentTheses;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.studentId.toLowerCase().includes(q) ||
        (t.studentName && t.studentName.toLowerCase().includes(q)) ||
        (t.advisorName && t.advisorName.toLowerCase().includes(q))
    );
  }

  if (advisorId) {
    filtered = filtered.filter((t) => t.advisorId === advisorId);
  }

  if (defenseStatus) {
    filtered = filtered.filter((t) => t.defenseStatus === defenseStatus);
  }

  if (sortBy) {
    filtered = [...filtered].sort((a, b) => {
      let valA: any = (a as any)[sortBy];
      let valB: any = (b as any)[sortBy];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'desc'
          ? valB.localeCompare(valA, 'vi')
          : valA.localeCompare(valB, 'vi');
      }

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      return sortOrder === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const pagedData = filtered.slice(startIndex, startIndex + pageSize);

  return {
    data: pagedData,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch aggregated KPI statistics for dashboard
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  await delay(30);
  return calculateDashboardKPIs(currentStudents);
}

/**
 * Update milestone status of a thesis
 */
export async function updateThesisMilestone(
  thesisId: string,
  milestoneId: string,
  status: MilestoneStatus,
  aiFeedback?: string
): Promise<boolean> {
  await delay(80);
  const thesis = currentTheses.find((t) => t._id === thesisId);
  if (!thesis) return false;

  const milestone = thesis.milestones.find((m) => m._id === milestoneId);
  if (!milestone) return false;

  milestone.status = status;
  if (aiFeedback) {
    milestone.aiFeedback = aiFeedback;
  }

  const completed = thesis.milestones.filter((m) => m.status === 'COMPLETED').length;
  thesis.progressPercent = Math.round((completed / thesis.milestones.length) * 100);
  thesis.defenseStatus = thesis.progressPercent >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE';
  thesis.updatedAt = new Date().toISOString();

  return true;
}

/**
 * Call backend AI RAG assistant (/ai/ask) with graceful fallback
 */
export async function askAcademicAI(question: string) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Graceful fallback when backend NestJS is not running
  }

  await delay(200);
  // Realistic fallback structured response
  const isAttendanceRelated = question.toLowerCase().includes('vắng') || question.toLowerCase().includes('điểm danh');
  if (isAttendanceRelated) {
    return {
      answer:
        'Theo Quy chế đào tạo và quản lý học vụ Trường VKU, sinh viên vắng quá 20% tổng số tiết của học phần sẽ không đủ điều kiện dự thi kết thúc học phần và nhận điểm F học phần đó.',
      confidence_score: 0.95,
      citations: ['Quy chế học vụ VKU - Điều 14 về điều kiện dự thi kết thúc học phần'],
      requires_human_escalation: false,
      suggested_actions: [
        'Kiểm tra bảng tổng hợp điểm danh chi tiết trên Dashboard',
        'Nộp đơn xin phép có minh chứng nếu vắng có lý do chính đáng',
      ],
    };
  }

  return {
    answer:
      'Hệ thống đã tiếp nhận câu hỏi của bạn. Để được hỗ trợ cụ thể về học vụ, đồ án tốt nghiệp hoặc điểm danh, bạn có thể tra cứu theo danh mục trên Dashboard hoặc liên hệ cố vấn học tập.',
    confidence_score: 0.82,
    citations: ['Sổ tay học vụ sinh viên VKU 2026'],
    requires_human_escalation: false,
    suggested_actions: ['Tra cứu danh sách sinh viên', 'Xem tiến độ đồ án'],
  };
}
