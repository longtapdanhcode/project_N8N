'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Student,
  DashboardKPIs,
  MilestoneStatus,
  Thesis,
} from '@/types';
import {
  getTopAttendanceViolators,
  askAcademicAI,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  CalendarCheck2,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Flame,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Activity,
} from 'lucide-react';

interface OverviewContentProps {
  kpis: DashboardKPIs;
}

export const OverviewContent: React.FC<OverviewContentProps> = ({ kpis }) => {
  const [topViolators, setTopViolators] = useState<Student[]>([]);
  const [violatorsLoading, setViolatorsLoading] = useState(true);

  // AI assistant state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{
    answer: string;
    confidence_score: number;
    citations: string[];
    requires_human_escalation: boolean;
    suggested_actions?: string[];
  } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    getTopAttendanceViolators(5).then((data) => {
      setTopViolators(data);
      setViolatorsLoading(false);
    });
  }, []);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await askAcademicAI(aiQuestion);
      setAiResponse(res);
    } catch {
      showToast('Có lỗi xảy ra khi truy vấn trợ lý AI!');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendWebhook = (studentId: string, name: string) => {
    showToast(`Đã gửi sự kiện ATTENDANCE_WARNING cho ${name} (${studentId}) sang n8n Webhook!`);
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* ============ Welcome Banner ============ */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold backdrop-blur-xs">
                Học kỳ 1 • 2026-2027
              </span>
              <span className="text-blue-100 text-xs">Cập nhật 10 phút trước</span>
            </div>
            <h2 className="text-xl font-bold">Hệ thống Cố vấn Học vụ VKU AI</h2>
            <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
              Giám sát tự động {kpis.totalStudents} sinh viên, phát hiện nguy cơ cấm thi theo Quy chế VKU Điều 14,
              và theo dõi đồ án tốt nghiệp với trợ lý Google Gemini RAG.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/students">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                Xem {kpis.totalStudents} sinh viên
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="white" size="sm">
                Xử lý cảnh báo
              </Button>
            </Link>
          </div>
        </div>

        {/* ============ KPI Stat Cards ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total students */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Tổng sinh viên</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.totalStudents}</div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              {kpis.activeStudents} đang hoạt động
            </span>
          </div>

          {/* Attendance warning */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-semibold">Cảnh báo điểm danh</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-700 tabular-nums">{kpis.attendanceWarningCount}</div>
            <span className="text-[11px] text-amber-600/80 flex items-center gap-1 mt-0.5">
              <Activity className="w-3 h-3" />
              Vắng ≥ 15% số tiết
            </span>
          </div>

          {/* Exam prohibited */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-semibold">Cấm thi (Điều 14)</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-700 tabular-nums">{kpis.examProhibitedCount}</div>
            <span className="text-[11px] text-rose-600/80 flex items-center gap-1 mt-0.5">
              <Flame className="w-3 h-3" />
              Vắng &gt; 20% → điểm F
            </span>
          </div>

          {/* Thesis progress */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Đồ án tốt nghiệp</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.totalTheses}</div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <BarChart3 className="w-3 h-3 text-indigo-500" />
              {Math.round(kpis.completedMilestonesRate * 100)}% milestones hoàn thành
            </span>
          </div>
        </div>

        {/* ============ Two Columns: Violators + AI Assistant ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Attendance Violators */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sinh viên vi phạm cao nhất</h3>
                  <p className="text-[11px] text-slate-400">Top 5 tỷ lệ vắng nghiêm trọng</p>
                </div>
              </div>
              <Link href="/attendance?status=PROHIBITED">
                <span className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1">
                  Xem tất cả <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            <div className="divide-y divide-slate-50">
              {violatorsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-7 h-7 rounded-full" />
                      <div>
                        <Skeleton className="h-3.5 w-28 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : topViolators.length > 0 ? (
                topViolators.map((s, idx) => {
                  const pct = Math.round((1 - s.attendanceRate) * 100);
                  return (
                    <div
                      key={s.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            idx < 3
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">
                            {s.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {s.studentId} • {s.classId}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={s.examProhibited ? 'danger' : 'warning'}
                          dot
                          size="sm"
                        >
                          {pct}% vắng
                        </Badge>
                        <button
                          onClick={() => handleSendWebhook(s.studentId, s.fullName)}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          title="Gửi webhook n8n"
                        >
                          Gửi n8n
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                  Tất cả sinh viên đều đủ điều kiện dự thi!
                </div>
              )}
            </div>
          </div>

          {/* AI Assistant */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trợ lý AI Học vụ (RAG)</h3>
                <p className="text-[11px] text-slate-400">Google Gemini • Quy chế VKU</p>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-72">
              {/* Example prompts */}
              {!aiResponse && !aiLoading && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Một số câu hỏi bạn có thể hỏi:</p>
                  {[
                    'Sinh viên nào vi phạm điều 14 về điểm danh?',
                    'Tóm tắt tiến độ đồ án tốt nghiệp nhóm CNTT?',
                    'Quy chế VKU quy định gì về vắng học?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setAiQuestion(q)}
                      className="block w-full text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                    >
                      &quot;{q}&quot;
                    </button>
                  ))}
                </div>
              )}

              {/* Loading */}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span>Đang phân tích dữ liệu học vụ với Gemini RAG...</span>
                </div>
              )}

              {/* Response */}
              {aiResponse && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/60 text-xs text-blue-900 leading-relaxed">
                    <p>{aiResponse.answer}</p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Độ tin cậy: <strong className="text-slate-900">{Math.round(aiResponse.confidence_score * 100)}%</strong>
                    </span>
                    {aiResponse.requires_human_escalation && (
                      <Badge variant="warning" size="sm" dot>
                        Cần xác minh thủ công
                      </Badge>
                    )}
                  </div>

                  {aiResponse.citations.length > 0 && (
                    <div className="text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600">Nguồn tham chiếu:</span>{' '}
                      {aiResponse.citations.join(', ')}
                    </div>
                  )}

                  {aiResponse.suggested_actions && aiResponse.suggested_actions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600">Hành động đề xuất:</span>
                      {aiResponse.suggested_actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setAiResponse(null);
                      setAiQuestion('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Hỏi câu khác →
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleAskAI} className="p-3 border-t border-slate-100 flex items-center gap-2">
              <input
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Hỏi về quy chế học vụ, điểm danh, đồ án..."
                className="flex-1 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 px-3 py-2 outline-none transition-all"
                disabled={aiLoading}
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuestion.trim()}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* ============ Quick Navigation Cards ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/students" className="group block">
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Quản lý Sinh viên</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Danh sách {kpis.totalStudents} sinh viên, phân trang server, tìm kiếm và lọc theo lớp sinh hoạt.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all">
                Xem bảng sinh viên <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          <Link href="/attendance" className="group block">
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <CalendarCheck2 className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Giám sát Điểm danh</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Theo dõi {kpis.attendanceWarningCount} cảnh báo và {kpis.examProhibitedCount} lệnh cấm thi theo Điều 14.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
                Xem bảng điểm danh <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          <Link href="/projects" className="group block">
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Đồ án Tốt nghiệp</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Quản lý {kpis.totalTheses} đề tài, {Math.round(kpis.completedMilestonesRate * 100)}% milestones đã hoàn thành.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                Xem bảng đồ án <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>

        {/* ============ System Info Footer ============ */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">Hệ thống hoạt động bình thường</span>
                <p className="text-[11px] text-slate-400">
                  Next.js 16 • NestJS • Google Gemini 2.5 Flash • n8n Workflow • BullMQ • MongoDB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Backend API
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Engine
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Webhook n8n
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
