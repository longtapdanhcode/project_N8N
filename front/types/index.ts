export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Milestone {
  _id: string;
  title: string;
  deadline: string;
  status: MilestoneStatus;
  aiFeedback?: string;
  submittedAt?: string;
  submissionUrl?: string;
}

export interface Thesis {
  _id: string;
  title: string;
  description?: string;
  studentId: string;
  studentName?: string;
  advisorId?: string;
  advisorName?: string;
  department?: string;
  milestones: Milestone[];
  progressPercent: number;
  defenseStatus?: 'NOT_ELIGIBLE' | 'ELIGIBLE' | 'DEFENDED';
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus = 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'GRADUATED';
export type AttendanceStatus = 'NORMAL' | 'WARNING' | 'PROHIBITED';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subjectCode: string;
  subjectName: string;
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  excusedAbsences: number;
  absenceRate: number; // e.g., 0.22 (22%)
  status: AttendanceStatus;
  lastUpdated: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  email: string;
  phone: string;
  classId: string;
  major: string;
  department: string;
  academicYear: string;
  status: StudentStatus;
  gpa: number;
  creditsEarned: number;
  totalCredits: number;
  attendanceRate: number; // e.g., 0.88 (88%)
  absentSessions: number;
  totalSessions: number;
  attendanceWarning: boolean; // vắng >= 15%
  examProhibited: boolean; // vắng > 20%
  thesisId?: string;
  thesis?: Thesis;
  createdAt: string;
}

export interface DashboardKPIs {
  totalStudents: number;
  activeStudents: number;
  attendanceWarningCount: number;
  examProhibitedCount: number;
  totalTheses: number;
  completedMilestonesRate: number;
  averageGpa: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  major?: string;
  classId?: string;
  status?: string;
  attendanceWarningOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubmissionFeedback {
  summary: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface Submission {
  _id: string;
  submissionId?: string;
  studentId: string;
  studentName?: string;
  courseName?: string;
  assignmentTitle: string;
  content: string;
  criteria?: string[];
  status: 'QUEUED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'QUEUE_FAILED';
  model?: string;
  feedback?: SubmissionFeedback;
  createdAt: string;
  updatedAt: string;
}
