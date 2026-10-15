import { Student, AttendanceRecord, Thesis, Submission } from '@/types';

/**
 * Helper to download a CSV file in browser with UTF-8 BOM
 */
function downloadCSV(csvContent: string, filename: string) {
  // \uFEFF is UTF-8 Byte Order Mark (BOM) to force Excel to open in UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export students list to CSV
 */
export function exportStudentsToCSV(students: Student[]) {
  const headers = [
    'Mã SV',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Lớp',
    'Chuyên ngành',
    'Niên khóa',
    'GPA',
    'Số tín chỉ',
    'Tiết vắng',
    'Tổng số tiết',
    'Tỷ lệ điểm danh',
    'Cảnh báo học vụ',
    'Cấm thi (Điều 14)',
    'Đề tài đồ án',
    'Tiến độ đồ án (%)',
    'Trạng thái bảo vệ',
  ];

  const rows = students.map((s) => [
    escapeCSV(s.studentId),
    escapeCSV(s.fullName),
    escapeCSV(s.email),
    escapeCSV(s.phone),
    escapeCSV(s.classId),
    escapeCSV(s.major),
    escapeCSV(s.academicYear),
    escapeCSV(s.gpa.toFixed(2)),
    escapeCSV(s.creditsEarned),
    escapeCSV(s.absentSessions),
    escapeCSV(s.totalSessions),
    escapeCSV(`${Math.round(s.attendanceRate * 100)}%`),
    escapeCSV(s.attendanceWarning ? 'CẢNH BÁO' : 'BÌNH THƯỜNG'),
    escapeCSV(s.examProhibited ? 'CẤM THI' : 'ĐỦ ĐIỀU KIỆN'),
    escapeCSV(s.thesis?.title || 'Chưa đăng ký'),
    escapeCSV(s.thesis ? `${s.thesis.progressPercent}%` : 'N/A'),
    escapeCSV(s.thesis ? (s.thesis.defenseStatus === 'ELIGIBLE' ? 'Đủ điều kiện' : 'Đang làm') : 'N/A'),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const now = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `VKU_Danh_sach_sinh_vien_${now}.csv`);
}

/**
 * Export attendance records to CSV
 */
export function exportAttendanceToCSV(records: AttendanceRecord[]) {
  const headers = [
    'Mã học phần',
    'Tên môn học',
    'Mã SV',
    'Họ tên sinh viên',
    'Lớp',
    'Số tiết vắng',
    'Vắng có phép',
    'Tổng số tiết',
    'Tỷ lệ vắng (%)',
    'Kết luận dự thi (Điều 14)',
  ];

  const rows = records.map((r) => [
    escapeCSV(r.subjectCode),
    escapeCSV(r.subjectName),
    escapeCSV(r.studentId),
    escapeCSV(r.studentName),
    escapeCSV(r.classId),
    escapeCSV(r.absentSessions),
    escapeCSV(r.excusedAbsences),
    escapeCSV(r.totalSessions),
    escapeCSV(`${Math.round(r.absenceRate * 100)}%`),
    escapeCSV(
      r.status === 'PROHIBITED'
        ? 'CẤM THI (ĐIỂM F)'
        : r.status === 'WARNING'
        ? 'CẢNH BÁO (≥ 15%)'
        : 'ĐỦ ĐIỀU KIỆN'
    ),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const now = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `VKU_Bang_diem_danh_Dieu14_${now}.csv`);
}

/**
 * Export thesis list to CSV
 */
export function exportThesesToCSV(theses: Thesis[]) {
  const headers = [
    'Mã đề tài',
    'Tên đề tài đồ án',
    'Mã SV',
    'Sinh viên thực hiện',
    'Giảng viên hướng dẫn',
    'Khoa / Bộ môn',
    'Tiến độ (%)',
    'Trạng thái bảo vệ',
    'Cột mốc hoàn thành',
    'Ngày nộp mới nhất',
  ];

  const rows = theses.map((t) => {
    const completedMilestones = t.milestones.filter((m) => m.status === 'COMPLETED').length;
    return [
      escapeCSV(t._id),
      escapeCSV(t.title),
      escapeCSV(t.studentId),
      escapeCSV(t.studentName || 'Chưa rõ'),
      escapeCSV(t.advisorName),
      escapeCSV(t.department),
      escapeCSV(`${t.progressPercent}%`),
      escapeCSV(t.defenseStatus === 'ELIGIBLE' ? 'ĐỦ ĐIỀU KIỆN BẢO VỆ' : 'ĐANG THỰC HIỆN'),
      escapeCSV(`${completedMilestones}/${t.milestones.length}`),
      escapeCSV(new Date(t.updatedAt).toLocaleDateString('vi-VN')),
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const now = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `VKU_Tien_do_do_an_tot_nghiep_${now}.csv`);
}

/**
 * Export submissions list to CSV
 */
export function exportSubmissionsToCSV(submissions: Submission[]) {
  const headers = [
    'Mã bài nộp',
    'Mã SV',
    'Họ tên sinh viên',
    'Môn học',
    'Tiêu đề bài nộp',
    'Trạng thái AI',
    'Điểm AI',
    'Model AI',
    'Thời gian nộp',
  ];

  const rows = submissions.map((s) => [
    escapeCSV(s._id),
    escapeCSV(s.studentId),
    escapeCSV(s.studentName || 'Chưa rõ'),
    escapeCSV(s.courseName || 'Lập trình Web'),
    escapeCSV(s.assignmentTitle),
    escapeCSV(
      s.status === 'COMPLETED'
        ? 'ĐÃ PHÂN TÍCH'
        : s.status === 'QUEUED' || s.status === 'PENDING'
        ? 'ĐANG PHÂN TÍCH'
        : 'THẤT BẠI'
    ),
    escapeCSV(s.feedback?.score !== undefined ? `${s.feedback.score}/10` : 'Chưa có'),
    escapeCSV(s.model || 'gemini-3.5-flash-lite'),
    escapeCSV(new Date(s.createdAt).toLocaleString('vi-VN')),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const now = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `VKU_Danh_sach_bai_nop_${now}.csv`);
}
