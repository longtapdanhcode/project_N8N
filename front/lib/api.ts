import { mockTeacherFetch } from './portal-mock';
const portalFetch = (url: string, init?: RequestInit) => process.env.NEXT_PUBLIC_PORTAL_MOCK === 'true' ? mockTeacherFetch(url, init) : fetch(url, init);
import { 
  Student, 
  AttendanceRecord, 
  Thesis, 
  DashboardKPIs, 
  PaginatedResult, 
  FilterOptions, 
  MilestoneStatus,
} from '../types';

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

/**
 * Fetch paginated, filtered, and searched students directly from live database
 */
export async function getStudents(options: FilterOptions = {}): Promise<PaginatedResult<Student>> {
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.major) params.set('major', options.major);
    if (options.classId) params.set('classId', options.classId);
    if (options.status) params.set('status', options.status);
    if (options.attendanceWarningOnly) params.set('attendanceWarningOnly', 'true');
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);

    const res = await portalFetch(`${BACKEND_BASE_URL}/students?${params.toString()}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch students from live backend:', error);
  }

  return {
    data: [],
    total: 0,
    page: options.page || 1,
    pageSize: options.pageSize || 20,
    totalPages: 0,
  };
}

/**
 * Fetch list of unique class IDs from live MongoDB
 */
export async function getClassList(): Promise<string[]> {
  try {
    const res = await portalFetch(`${BACKEND_BASE_URL}/students/classes`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch class list from live backend:', error);
  }
  return [];
}

/**
 * Fetch top students violating attendance from live database
 */
export async function getTopAttendanceViolators(limit = 5): Promise<Student[]> {
  try {
    const res = await portalFetch(`${BACKEND_BASE_URL}/students/top-violators?limit=${limit}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch attendance violators from live backend:', error);
  }
  return [];
}

/**
 * Fetch a single student by ID with full grades and attendance history
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const res = await portalFetch(`${BACKEND_BASE_URL}/students/${encodeURIComponent(studentId)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error(`Failed to fetch student "${studentId}" from live backend:`, error);
  }
  return null;
}

/**
 * Fetch attendance records with filtering and pagination from live backend
 */
export async function getAttendanceRecords(options: {
  search?: string;
  status?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResult<AttendanceRecord>> {
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.status && options.status !== 'ALL') params.set('status', options.status);
    if (options.classId) params.set('classId', options.classId);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);

    const res = await portalFetch(`${BACKEND_BASE_URL}/attendance/records?${params.toString()}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch attendance records from live backend:', error);
  }

  return {
    data: [],
    total: 0,
    page: options.page || 1,
    pageSize: options.pageSize || 20,
    totalPages: 0,
  };
}

/**
 * Fetch theses with filtering and pagination from live MongoDB
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
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.advisorId) params.set('advisorId', options.advisorId);
    if (options.defenseStatus) params.set('defenseStatus', options.defenseStatus);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);

    const res = await portalFetch(`${BACKEND_BASE_URL}/theses?${params.toString()}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch theses from live backend:', error);
  }

  return {
    data: [],
    total: 0,
    page: options.page || 1,
    pageSize: options.pageSize || 20,
    totalPages: 0,
  };
}

/**
 * Fetch aggregated KPI statistics computed in real-time by live database
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  try {
    const res = await portalFetch(`${BACKEND_BASE_URL}/dashboard/kpis`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch KPIs from live backend:', error);
  }

  return {
    totalStudents: 0,
    activeStudents: 0,
    attendanceWarningCount: 0,
    examProhibitedCount: 0,
    totalTheses: 0,
    completedMilestonesRate: 0,
    averageGpa: 0,
  };
}

/**
 * Update milestone status of a thesis in live MongoDB
 */
export async function updateThesisMilestone(
  thesisId: string,
  milestoneId: string,
  status: MilestoneStatus,
  aiFeedback?: string,
): Promise<boolean> {
  const data = await serviceRequest<{success: boolean}>(`/theses/${encodeURIComponent(thesisId)}/milestones/${encodeURIComponent(milestoneId)}`, {method:'PATCH', headers:{'Content-Type':'application/json'},body:JSON.stringify({status,aiFeedback})});
  return data.success;
}

async function serviceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await portalFetch(`${BACKEND_BASE_URL}${path}`, {...init, cache:'no-store', signal:AbortSignal.timeout(130_000)});
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Yêu cầu thất bại (${res.status})`);
  return data;
}
export async function refreshThesis(thesis: Thesis): Promise<Thesis> {
  for (let page = 1; ; page++) {
    const result = await serviceRequest<PaginatedResult<Thesis>>(`/theses?search=${encodeURIComponent(thesis.studentId)}&page=${page}&pageSize=50`);
    const found = result.data.find(t => t._id === thesis._id);
    if (found) return found;
    if (page >= result.totalPages) throw new Error('Không tìm thấy đồ án. Hãy tải lại danh sách.');
  }
}
export interface KnowledgeDocument {id: string; title: string; content: string; created_at: string}
export const getDocuments = (offset = 0) => serviceRequest<{data: KnowledgeDocument[]}>(`/documents?limit=20&offset=${offset}`);
export function ingestDocument(input: {title: string; content: string; category: string}, file?: File) {
  if (file) {
    const body = new FormData(); body.append('file',file); body.append('title',input.title); body.append('category',input.category);
    return serviceRequest<{success:boolean; chunks_created:number}>('/documents/ingest-file',{method:'POST',body});
  }
  return serviceRequest<{success:boolean; chunks_created:number}>('/documents/ingest-text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
}

/**
 * Fetch courses from live Supabase
 */
export async function fetchCourses(): Promise<any[]> {
  try {
    const res = await portalFetch(`${BACKEND_BASE_URL}/courses`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (error) {
    console.error('Failed to fetch courses from live backend:', error);
  }
  return [];
}

/**
 * Fetch class sections with live enrollment headcount from Supabase
 */
export async function fetchClassSections(): Promise<any[]> {
  try {
    const res = await portalFetch(`${BACKEND_BASE_URL}/class-sections`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (error) {
    console.error('Failed to fetch class sections from live backend:', error);
  }
  return [];
}

/**
 * Fetch attendance audit / history from Supabase
 */
export async function fetchAttendanceHistory(classSectionId?: string): Promise<any> {
  try {
    const url = classSectionId
      ? `${BACKEND_BASE_URL}/attendance/history?class_section_id=${encodeURIComponent(classSectionId)}`
      : `${BACKEND_BASE_URL}/attendance/history`;
    const res = await portalFetch(url, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (error) {
    console.error('Failed to fetch attendance history from live backend:', error);
  }
  return { data: [], total: 0 };
}

/**
 * Call backend AI RAG assistant (/ai/ask)
 */
export async function askAcademicAI(question: string) {
  try {
    const response = await portalFetch(`${BACKEND_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to invoke AI RAG assistant:', error);
  }

  return {
    answer:
      'Hệ thống đang bảo trì kết nối AI. Vui lòng thử lại sau ít phút hoặc tra cứu quy chế trực tiếp trên Dashboard.',
    confidence_score: 0.5,
    citations: ['Cổng thông tin đào tạo VKU'],
    requires_human_escalation: true,
    suggested_actions: ['Tra cứu danh sách sinh viên', 'Liên hệ Cố vấn học tập'],
  };
}

export interface AcademicWarningScanResponse {
  success: boolean;
  total_violations: number;
  dispatched_count: number;
  violations: Array<{
    student_id: string;
    full_name: string;
    student_email?: string;
    gpa: number;
    absent_rate: number;
    failed_credits: number;
    warning_tier: string;
    advisor_email: string;
  }>;
}

/**
 * Trigger academic warning scan across all students in MongoDB and dispatch alerts to n8n webhook
 */
export async function scanAcademicWarnings(limit = 1): Promise<AcademicWarningScanResponse> {
  const response = await portalFetch(`${BACKEND_BASE_URL}/academic-warning/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit }),
  });

  if (!response.ok) {
    throw new Error(`Quét cảnh báo học vụ thất bại (${response.status} ${response.statusText})`);
  }

  return await response.json();
}
