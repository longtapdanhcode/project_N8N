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
  scanAcademicWarnings,
  type AcademicWarningScanResponse,
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

  // Scan academic warnings state
  const [isScanning, setIsScanning] = useState(false);
  const [scanLimit, setScanLimit] = useState(0);
  const [scanResult, setScanResult] = useState<AcademicWarningScanResponse | null>(null);
  const [scanError, setScanError] = useState('');

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    getTopAttendanceViolators(5).then((data) => {
      setTopViolators(data);
      setViolatorsLoading(false);
    });
  }, []);

  const handleScanWarnings = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError('');
    try {
      const result = await scanAcademicWarnings(scanLimit);
      setScanResult(result);
      const violationsCount = result.total_violations ?? result.violations?.length ?? 0;
      const dispatched = result.dispatched_count ?? 0;
      showToast(
        `Phát hiện ${violationsCount} sinh viên cần cảnh báo; đã chuyển ${dispatched} bản ghi sang n8n.`,
        'success',
      );
    } catch (error: any) {
      setScanError(error instanceof Error ? error.message : 'Không quét được cảnh báo.');
      console.error('Lỗi khi quét cảnh báo học vụ:', error);
      showToast(
        'Lỗi kết nối máy chủ backend khi quét cảnh báo học vụ! Vui lòng thử lại.',
        'error',
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await askAcademicAI(aiQuestion);
      setAiResponse(res);
    } catch {
      showToast('Có lỗi xảy ra khi truy vấn trợ lý AI!', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-800'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="service-page flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[var(--muted)]">
                Học kỳ 1 • 2026-2027
              </span>
            </div>
            <h2 className="text-xl font-bold">Hệ thống Cố vấn Học vụ VKU AI</h2>
            <p className="text-sm text-[var(--muted)]">
              Theo dõi sinh viên, cảnh báo học vụ và tiến độ đồ án.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/teacher/students">
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--border)] text-[var(--primary)]"
              >
                Xem {kpis.totalStudents} sinh viên
              </Button>
            </Link>
            <Button
              type="button"
              variant="white"
              size="sm"
              disabled={isScanning}
              isLoading={isScanning}
              onClick={handleScanWarnings}
            >
              {isScanning ? 'Đang xử lý...' : 'Xử lý cảnh báo'}
            </Button>
          </div>
        </div>

        <section className="service-page" aria-label="Kết quả cảnh báo học vụ">
          <label>Giới hạn chuyển cảnh báo tới n8n<select value={scanLimit} disabled={isScanning} onChange={e => setScanLimit(Number(e.target.value))}>
            <option value={0}>Chỉ quét, chưa gửi thông báo</option><option value={1}>Gửi tối đa 1 sinh viên</option><option value={5}>Gửi tối đa 5 sinh viên</option><option value={20}>Gửi tối đa 20 sinh viên</option>
          </select></label>
          {scanError && <p className="service-error" role="alert">{scanError}</p>}
          {isScanning ? <div className="service-loading" role="status">Đang quét cảnh báo…</div> : scanResult ? <>
            <p role="status">{scanResult.total_violations} sinh viên cần cảnh báo · Đã chuyển {scanResult.dispatched_count}/{Math.min(scanLimit,scanResult.total_violations)} thông báo tới n8n.</p>
            {scanResult.dispatched_count < Math.min(scanLimit,scanResult.total_violations) && <p className="service-error">Một số thông báo chưa chuyển được. Kiểm tra kết nối n8n trước khi gửi lại.</p>}
            {!scanResult.violations.length ? <p>Không phát hiện vi phạm trong lần quét này.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>MSSV</th><th>Họ tên</th><th>GPA</th><th>Vắng (%)</th><th>Mức cảnh báo</th></tr></thead><tbody>{scanResult.violations.map(s => <tr key={s.student_id} className="border-b border-[var(--border)]"><td className="py-3">{s.student_id}</td><td>{s.full_name}</td><td>{s.gpa}</td><td>{s.absent_rate}</td><td>{s.warning_tier.replace('TIER_','Mức ')}</td></tr>)}</tbody></table></div>}
          </> : <p>Bấm Xử lý cảnh báo để xem kết quả.</p>}
        </section>

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
              <Link href="/teacher/attendance?status=PROHIBITED">
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
                        <Link
                          href={`/teacher/students?search=${encodeURIComponent(s.studentId)}`}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          title="Xem hồ sơ sinh viên"
                        >
                          Xem hồ sơ
                        </Link>
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
          <Link href="/teacher/students" className="group block">
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

          <Link href="/teacher/attendance" className="group block">
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

          <Link href="/teacher/projects" className="group block">
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
