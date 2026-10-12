'use client';

import React from 'react';
import { Student } from '@/types';
import { Badge, Button } from '@/components/ui';
import {
  X,
  User,
  Mail,
  Phone,
  GraduationCap,
  AlertTriangle,
  Calendar,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onSendWarning?: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onSendWarning,
}) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {student.fullName
                .split(' ')
                .slice(-2)
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{student.fullName}</h2>
                <Badge
                  variant={
                    student.status === 'ACTIVE'
                      ? 'success'
                      : student.status === 'WARNING'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {student.status === 'ACTIVE'
                    ? 'Đang học'
                    : student.status === 'WARNING'
                    ? 'Cảnh báo học vụ'
                    : 'Tốt nghiệp'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                MSSV: <span className="font-semibold text-slate-700">{student.studentId}</span> • Lớp: {student.classId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* General Information Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Thông tin chung
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-slate-400 block text-[10px]">Email sinh viên</span>
                  <span className="font-medium text-slate-700 truncate">{student.email}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Số điện thoại</span>
                  <span className="font-medium text-slate-700">{student.phone}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Chuyên ngành</span>
                  <span className="font-medium text-slate-700">{student.major}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Khóa học</span>
                  <span className="font-medium text-slate-700">{student.academicYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic & Attendance Status */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Học vụ & Tình trạng điểm danh
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-1">Điểm GPA</span>
                <span className="text-lg font-bold text-slate-900">{student.gpa.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Thang 4.0</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-1">Tích lũy tín chỉ</span>
                <span className="text-lg font-bold text-slate-900">
                  {student.creditsEarned}
                  <span className="text-xs text-slate-400 font-normal"> / {student.totalCredits}</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Tín chỉ</span>
              </div>

              <div
                className={`p-3 rounded-xl border shadow-2xs ${
                  student.examProhibited
                    ? 'border-rose-200 bg-rose-50/60'
                    : student.attendanceWarning
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="text-[11px] text-slate-500 block mb-1">Số tiết vắng</span>
                <span
                  className={`text-lg font-bold ${
                    student.examProhibited
                      ? 'text-rose-600'
                      : student.attendanceWarning
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}
                >
                  {student.absentSessions}
                  <span className="text-xs font-normal text-slate-400"> / {student.totalSessions}</span>
                </span>
                <span className="text-[10px] block font-medium mt-0.5">
                  {student.examProhibited ? (
                    <span className="text-rose-600 font-bold">Cấm thi (&gt; 20%)</span>
                  ) : student.attendanceWarning ? (
                    <span className="text-amber-600 font-bold">Cảnh báo (≥ 15%)</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Bình thường</span>
                  )}
                </span>
              </div>
            </div>

            {student.examProhibited && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Cảnh báo vi phạm Quy chế đào tạo VKU (Điều 14):</span>
                  <p className="mt-0.5 leading-relaxed">
                    Sinh viên đã vắng quá 20% tổng số tiết học phần. Không đủ điều kiện dự thi kết thúc học phần và nhận điểm F nếu không có quyết định bổ sung của Hội đồng khoa.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Thesis Section (If applicable) */}
          {student.thesis && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Đồ án tốt nghiệp & Phản hồi AI
              </h3>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Đề tài:
                    </span>
                    <Badge variant="primary">Tiến độ: {student.thesis.progressPercent}%</Badge>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mt-1">
                    {student.thesis.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    GVHD: <span className="font-medium text-slate-700">{student.thesis.advisorName}</span>
                  </p>
                </div>

                {/* Milestones list */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Cột mốc thực hiện (Milestones):
                  </span>
                  {student.thesis.milestones.map((m, idx) => (
                    <div
                      key={m._id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 flex items-center gap-2">
                          {m.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          M{idx + 1}: {m.title}
                        </span>
                        <Badge
                          variant={
                            m.status === 'COMPLETED'
                              ? 'success'
                              : m.status === 'IN_PROGRESS'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {m.status === 'COMPLETED'
                            ? 'Hoàn thành'
                            : m.status === 'IN_PROGRESS'
                            ? 'Đang làm'
                            : 'Chờ duyệt'}
                        </Badge>
                      </div>

                      {m.aiFeedback && (
                        <div className="p-2 rounded bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-1.5 mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>AI Feedback:</strong> {m.aiFeedback}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Ngày khởi tạo: {new Date(student.createdAt).toLocaleDateString('vi-VN')}
          </div>
          <div className="flex items-center gap-2">
            {student.attendanceWarning && onSendWarning && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onSendWarning(student)}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Gửi cảnh báo n8n
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
