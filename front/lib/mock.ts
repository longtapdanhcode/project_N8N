import { Student, Thesis, AttendanceRecord, DashboardKPIs, Milestone, MilestoneStatus } from '@/types';

// Deterministic Pseudo-Random Generator (LCG) for reproducible, stable mock data
class SeededRandom {
  private seed: number;

  constructor(seed = 1998) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min));
  }

  choice<T>(array: readonly T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

const rng = new SeededRandom(20261010);

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đoàn'];
const MIDDLE_MALE = ['Văn', 'Hữu', 'Đức', 'Quốc', 'Thành', 'Minh', 'Đình', 'Bảo', 'Gia', 'Tuấn', 'Hải', 'Thế'];
const FIRST_MALE = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Huy', 'Hùng', 'Khoa', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Tài', 'Thắng', 'Thịnh', 'Trung', 'Tú', 'Việt'];

const MIDDLE_FEMALE = ['Thị', 'Ngọc', 'Thảo', 'Phương', 'Mai', 'Thanh', 'Như', 'Hồng', 'Yến', 'Ánh', 'Bích', 'Kim'];
const FIRST_FEMALE = ['Anh', 'Chi', 'Dung', 'Hà', 'Hân', 'Hương', 'Linh', 'Mai', 'My', 'Ngân', 'Nhi', 'Nhung', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Trâm', 'Uyên', 'Vân', 'Vy', 'Xuân', 'Yến'];

interface MajorConfig {
  code: string;
  name: string;
  department: string;
}

const MAJORS: MajorConfig[] = [
  { code: 'GIT', name: 'Công nghệ Thông tin (Global IT)', department: 'Khoa Khoa học Máy tính' },
  { code: 'IT', name: 'Công nghệ Thông tin', department: 'Khoa Khoa học Máy tính' },
  { code: 'AI', name: 'Trí tuệ Nhân tạo', department: 'Khoa Khoa học Máy tính' },
  { code: 'DS', name: 'Khoa học Dữ liệu & Phân tích Dữ liệu', department: 'Khoa Khoa học Máy tính' },
  { code: 'CS', name: 'Khoa học Máy tính', department: 'Khoa Khoa học Máy tính' },
  { code: 'CE', name: 'Kỹ thuật Máy tính & IoT', department: 'Khoa Kỹ thuật Máy tính & Điện tử' },
  { code: 'BA', name: 'Quản trị Kinh doanh số', department: 'Khoa Kinh tế số & TMĐT' },
  { code: 'FIN', name: 'Công nghệ Tài chính (Fintech)', department: 'Khoa Kinh tế số & TMĐT' },
];

const ADVISORS = [
  { id: 'ADV-01', name: 'TS. Nguyễn Văn Hùng', department: 'Khoa Khoa học Máy tính' },
  { id: 'ADV-02', name: 'PGS.TS. Trần Quốc Tuấn', department: 'Khoa Khoa học Máy tính' },
  { id: 'ADV-03', name: 'TS. Lê Thị Mai', department: 'Khoa Kỹ thuật Máy tính & Điện tử' },
  { id: 'ADV-04', name: 'TS. Đặng Minh Nhật', department: 'Khoa Kinh tế số & TMĐT' },
  { id: 'ADV-05', name: 'ThS. Phan Thanh Sơn', department: 'Khoa Khoa học Máy tính' },
  { id: 'ADV-06', name: 'TS. Vũ Bích Ngọc', department: 'Khoa Kinh tế số & TMĐT' },
];

const THESIS_TOPICS = [
  'Hệ sinh thái Trợ lý RAG AI hỗ trợ học vụ thông minh kết hợp Supabase pgvector và Gemini',
  'Ứng dụng Reciprocal Rank Fusion (RRF) tối ưu hóa truy vấn quy chế đào tạo đại học',
  'Hệ thống giám sát điểm danh sinh viên tự động và cảnh báo học vụ thời gian thực qua n8n',
  'Kiến trúc Message Queue BullMQ xử lý tác vụ chấm bài tự động quy mô lớn',
  'Nền tảng phân tích hành vi học tập và dự báo nguy cơ trượt môn dựa trên Machine Learning',
  'Giải pháp xác thực chữ ký HMAC-SHA256 bảo mật liên thông webhook Microservices',
  'Ứng dụng nhận diện khuôn mặt trên Edge Device phục vụ điểm danh phòng học thông minh',
  'Hệ thống quản lý đề tài tốt nghiệp số hóa quy trình phê duyệt và thẩm định đồ án',
  'Mô hình đánh giá năng lực lập trình sinh viên ứng dụng LLM Multi-Turn Evaluation',
  'Nền tảng thương mại điện tử phi tập trung tích hợp cổng thanh toán thông minh',
  'Hệ thống phát hiện bất thường trong dữ liệu học phí và điểm danh sinh viên',
  'Trợ lý ảo hỗ trợ cố vấn học tập định hướng chương trình đào tạo cá nhân hóa',
];

const SUBJECTS = [
  { code: 'IT3010', name: 'Hệ thống phân tán & Điện toán đám mây', totalSessions: 45 },
  { code: 'IT3025', name: 'Trí tuệ nhân tạo nâng cao', totalSessions: 60 },
  { code: 'IT3040', name: 'Kiến trúc phần mềm & Thiết kế hệ thống', totalSessions: 45 },
  { code: 'BA2010', name: 'Kinh tế số & Phân tích kinh doanh', totalSessions: 45 },
  { code: 'DS3030', name: 'Khai phá dữ liệu & Học máy ứng dụng', totalSessions: 60 },
  { code: 'CE2050', name: 'Hệ nhúng & Internet vạn vật (IoT)', totalSessions: 60 },
];

function generateVietnameseName(gender: 'MALE' | 'FEMALE'): string {
  const last = rng.choice(LAST_NAMES);
  if (gender === 'MALE') {
    const mid = rng.choice(MIDDLE_MALE);
    const first = rng.choice(FIRST_MALE);
    return `${last} ${mid} ${first}`;
  } else {
    const mid = rng.choice(MIDDLE_FEMALE);
    const first = rng.choice(FIRST_FEMALE);
    return `${last} ${mid} ${first}`;
  }
}

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function generateTheses(studentId: string, studentName: string, major: MajorConfig): Thesis {
  const advisor = rng.choice(ADVISORS);
  const topic = rng.choice(THESIS_TOPICS);
  const progressRatio = rng.next();

  let m1Status: MilestoneStatus = 'COMPLETED';
  let m2Status: MilestoneStatus = 'PENDING';
  let m3Status: MilestoneStatus = 'PENDING';
  let m4Status: MilestoneStatus = 'PENDING';

  if (progressRatio > 0.75) {
    m1Status = 'COMPLETED';
    m2Status = 'COMPLETED';
    m3Status = 'COMPLETED';
    m4Status = rng.next() > 0.5 ? 'COMPLETED' : 'IN_PROGRESS';
  } else if (progressRatio > 0.5) {
    m1Status = 'COMPLETED';
    m2Status = 'COMPLETED';
    m3Status = 'IN_PROGRESS';
  } else if (progressRatio > 0.25) {
    m1Status = 'COMPLETED';
    m2Status = 'IN_PROGRESS';
  } else {
    m1Status = 'IN_PROGRESS';
  }

  const milestones: Milestone[] = [
    {
      _id: `ms1-${studentId}`,
      title: 'Đề cương chi tiết & Nghiên cứu tổng quan',
      deadline: '2026-03-15T00:00:00.000Z',
      status: m1Status,
      aiFeedback: m1Status === 'COMPLETED' 
        ? 'Đề cương đã được duyệt, mục tiêu rõ ràng và có tính ứng dụng cao cho VKU.' 
        : 'Cần bổ sung tài liệu tham khảo quốc tế và làm rõ phương pháp luận RRF.',
      submittedAt: '2026-03-12T14:30:00.000Z',
    },
    {
      _id: `ms2-${studentId}`,
      title: 'Thiết kế kiến trúc hệ thống & Triển khai MVP',
      deadline: '2026-05-20T00:00:00.000Z',
      status: m2Status,
      aiFeedback: m2Status === 'COMPLETED'
        ? 'Kiến trúc Subdocument và Message Queue BullMQ xử lý tải ổn định.'
        : m2Status === 'IN_PROGRESS'
        ? 'Đang phát triển module webhook và xác thực HMAC, cần kiểm thử tải trên Redis.'
        : undefined,
      submittedAt: m2Status === 'COMPLETED' ? '2026-05-18T10:15:00.000Z' : undefined,
    },
    {
      _id: `ms3-${studentId}`,
      title: 'Thử nghiệm, Đo lường hiệu năng & Tối ưu AI',
      deadline: '2026-08-10T00:00:00.000Z',
      status: m3Status,
      aiFeedback: m3Status === 'COMPLETED'
        ? 'Tỷ lệ RRF ranking đạt độ chính xác >94%, thời gian phản hồi đạt yêu cầu.'
        : undefined,
    },
    {
      _id: `ms4-${studentId}`,
      title: 'Hoàn thiện luận văn & Chuẩn bị bảo vệ trước hội đồng',
      deadline: '2026-10-30T00:00:00.000Z',
      status: m4Status,
      aiFeedback: m4Status === 'COMPLETED'
        ? 'Đủ điều kiện bảo vệ trước hội đồng khoa học cấp trường.'
        : undefined,
    },
  ];

  const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  return {
    _id: `the-${studentId}`,
    title: `${topic} (${major.code})`,
    description: `Nghiên cứu ứng dụng và triển khai thực nghiệm giải pháp phục vụ chuyển đổi số tại VKU.`,
    studentId,
    studentName,
    advisorId: advisor.id,
    advisorName: advisor.name,
    department: major.department,
    milestones,
    progressPercent,
    defenseStatus: progressPercent >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
  };
}

// Generate exactly 500 mock students
export function create500MockStudents(): Student[] {
  const students: Student[] = [];
  const years = ['21', '22', '23', '24'];

  for (let i = 1; i <= 500; i++) {
    const gender: 'MALE' | 'FEMALE' = rng.next() > 0.4 ? 'MALE' : 'FEMALE';
    const fullName = generateVietnameseName(gender);
    const major = rng.choice(MAJORS);
    const year = rng.choice(years);
    const classNum = rng.range(1, 4);
    const classId = `${year}${major.code}_0${classNum}`;

    // MSSV format: 21IT001, 22GIT145, 23AI089
    const paddedIndex = String(i).padStart(3, '0');
    const studentId = `${year}${major.code}${paddedIndex}`;

    const nameParts = removeAccents(fullName).split(' ');
    const emailPrefix = `${nameParts[nameParts.length - 1]}${nameParts[0][0]}${nameParts[1] ? nameParts[1][0] : ''}.${studentId.toLowerCase()}`;
    const email = `${emailPrefix}@vku.udn.vn`;
    const phone = `0${rng.range(32, 39)}${rng.range(1000000, 9999999)}`;

    // Attendance stats
    const totalSessions = 60;
    // Distribution: mostly good attendance (0-6 absences), some warning (9-12), few critical (>12)
    const absenceRoll = rng.next();
    let absentSessions = 0;
    if (absenceRoll < 0.70) {
      absentSessions = rng.range(0, 6); // 0% - 10%
    } else if (absenceRoll < 0.88) {
      absentSessions = rng.range(6, 10); // 10% - 16.6% (some warning)
    } else if (absenceRoll < 0.95) {
      absentSessions = rng.range(10, 13); // 16.6% - 21.6% (warning)
    } else {
      absentSessions = rng.range(13, 20); // > 21.6% (exam prohibited: > 20%)
    }

    const absenceRate = absentSessions / totalSessions;
    const attendanceRate = Math.round((1 - absenceRate) * 100) / 100;
    const attendanceWarning = absenceRate >= 0.15;
    const examProhibited = absenceRate > 0.20;

    // Academic performance
    const gpaRaw = 2.0 + rng.next() * 2.0; // 2.00 to 4.00
    const gpa = Math.round(gpaRaw * 100) / 100;

    let totalCredits = 135;
    let creditsEarned = 35;
    if (year === '21') {
      creditsEarned = rng.range(115, 135);
    } else if (year === '22') {
      creditsEarned = rng.range(80, 110);
    } else if (year === '23') {
      creditsEarned = rng.range(45, 75);
    } else {
      creditsEarned = rng.range(15, 40);
    }

    let status: Student['status'] = 'ACTIVE';
    if (examProhibited || gpa < 2.0) {
      status = 'WARNING';
    } else if (year === '21' && creditsEarned >= 130 && rng.next() > 0.8) {
      status = 'GRADUATED';
    }

    // Thesis generation for seniors (Khóa 21 or 22 with high credits)
    let thesis: Thesis | undefined = undefined;
    let thesisId: string | undefined = undefined;
    if (year === '21' || (year === '22' && creditsEarned >= 95)) {
      thesis = generateTheses(studentId, fullName, major);
      thesisId = thesis._id;
    }

    students.push({
      id: studentId,
      studentId,
      fullName,
      gender,
      email,
      phone,
      classId,
      major: major.name,
      department: major.department,
      academicYear: `20${year}-20${Number(year) + 4}`,
      status,
      gpa,
      creditsEarned,
      totalCredits,
      attendanceRate,
      absentSessions,
      totalSessions,
      attendanceWarning,
      examProhibited,
      thesisId,
      thesis,
      createdAt: `20${year}-09-05T00:00:00.000Z`,
    });
  }

  return students;
}

// Generate attendance records for subjects
export function createMockAttendanceRecords(students: Student[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  students.slice(0, 120).forEach((student, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];
    const totalSessions = subject.totalSessions;
    
    // Use student's absent sessions ratio
    const absent = Math.min(totalSessions, Math.round(student.absentSessions * (totalSessions / student.totalSessions)));
    const excused = Math.floor(absent * 0.3);
    const attended = totalSessions - absent;
    const absenceRate = Math.round((absent / totalSessions) * 100) / 100;

    let status: AttendanceRecord['status'] = 'NORMAL';
    if (absenceRate > 0.20) {
      status = 'PROHIBITED';
    } else if (absenceRate >= 0.15) {
      status = 'WARNING';
    }

    records.push({
      id: `att-${student.studentId}-${subject.code}`,
      studentId: student.studentId,
      studentName: student.fullName,
      classId: student.classId,
      subjectCode: subject.code,
      subjectName: subject.name,
      totalSessions,
      attendedSessions: attended,
      absentSessions: absent,
      excusedAbsences: excused,
      absenceRate,
      status,
      lastUpdated: '2026-10-10T08:30:00.000Z',
    });
  });

  return records;
}

// Singleton instances for mock database
export const MOCK_STUDENTS: Student[] = create500MockStudents();
export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = createMockAttendanceRecords(MOCK_STUDENTS);
export const MOCK_THESES: Thesis[] = MOCK_STUDENTS.filter(s => s.thesis).map(s => s.thesis!);

export function calculateDashboardKPIs(students: Student[] = MOCK_STUDENTS): DashboardKPIs {
  const total = students.length;
  const active = students.filter(s => s.status === 'ACTIVE').length;
  const warning = students.filter(s => s.attendanceWarning).length;
  const prohibited = students.filter(s => s.examProhibited).length;
  const theses = students.filter(s => s.thesis).map(s => s.thesis!);
  
  let totalMilestones = 0;
  let completedMilestones = 0;
  theses.forEach(t => {
    t.milestones.forEach(m => {
      totalMilestones++;
      if (m.status === 'COMPLETED') completedMilestones++;
    });
  });

  const avgGpa = Math.round((students.reduce((acc, s) => acc + s.gpa, 0) / (total || 1)) * 100) / 100;
  const milestoneRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    totalStudents: total,
    activeStudents: active,
    attendanceWarningCount: warning,
    examProhibitedCount: prohibited,
    totalTheses: theses.length,
    completedMilestonesRate: milestoneRate,
    averageGpa: avgGpa,
  };
}
