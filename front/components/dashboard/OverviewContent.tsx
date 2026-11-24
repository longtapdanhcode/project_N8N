'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Student, DashboardKPIs } from '@/types';
import {
  getTopAttendanceViolators,
  askAcademicAI,
  RateLimitError,
  scanAcademicWarnings,
  type AcademicWarningScanResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, ArrowRight, CheckCircle2, Send } from 'lucide-react';

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
    dispatched_to_n8n?: boolean;
  } | null>(null);
  // Hội thoại hiện tại: backend dùng vài câu gần nhất làm ngữ cảnh cho câu hỏi tiếp theo.
  const [conversationId, setConversationId] = useState<string>();
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    getTopAttendanceViolators(5)
      .then(setTopViolators)
      .finally(() => setViolatorsLoading(false));
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
    } catch (error: unknown) {
      setScanError(error instanceof Error ? error.message : 'Không quét được cảnh báo.');
      console.error('Lỗi khi quét cảnh báo học vụ:', error);
      showToast('Không quét được cảnh báo học vụ. Vui lòng thử lại.', 'error');
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
      const question = aiQuestion.trim();
      const res = await askAcademicAI(question, conversationId);
      setAiResponse(res);
      if (res.conversationId) {
        setConversationId(res.conversationId);
        setAskedQuestions((prev) =>
          res.conversationId === conversationId ? [...prev, question] : [question],
        );
      }
    } catch (error) {
      showToast(
        error instanceof RateLimitError ? error.message : 'Trợ lý chưa trả lời được. Vui lòng thử lại.',
        'error',
      );
    } finally {
      setAiLoading(false);
    }
  };

  const panel = 'rounded-lg border border-[var(--border)] bg-[var(--surface)]';
  const panelHead = 'flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3';
  const textLink =
    'inline-flex items-center gap-1 rounded-md text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer';
  const plannedDispatch = scanResult ? Math.min(scanLimit, scanResult.total_violations) : 0;

  const kpiCells: {
    label: string;
    value: number;
    note: string;
    tone?: 'warning' | 'danger';
  }[] = [
    { label: 'Tổng sinh viên', value: kpis.totalStudents, note: `${kpis.activeStudents} đang học` },
    {
      label: 'Cảnh báo điểm danh',
      value: kpis.attendanceWarningCount,
      note: 'Vắng từ 15% số tiết',
      tone: 'warning',
    },
    {
      label: 'Cấm thi',
      value: kpis.examProhibitedCount,
      note: 'Vắng trên 20% số tiết (Điều 14)',
      tone: 'danger',
    },
    {
      label: 'Đồ án tốt nghiệp',
      value: kpis.totalTheses,
      note: `${Math.round(kpis.completedMilestonesRate)}% mốc đã hoàn thành`,
    },
  ];

  return (
    <>
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border bg-[var(--surface)] px-4 py-3 text-xs ${
            toast.type === 'error'
              ? 'border-[#59323e] text-[var(--danger)]'
              : 'border-[var(--border)] text-[var(--text)]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-[var(--primary)]" strokeWidth={1.5} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="space-y-6 text-xs">
        {/* Số liệu học kỳ: mỗi ô có nhãn chữ, không chỉ dựa vào màu. */}
        <dl className={`${panel} grid grid-cols-2 lg:grid-cols-4`}>
          {kpiCells.map((cell, i) => (
            <div
              key={cell.label}
              className={`p-4 ${i % 2 ? 'border-l border-[var(--border)]' : ''} ${
                i >= 2 ? 'border-t border-[var(--border)] lg:border-t-0' : ''
              } ${i === 2 ? 'lg:border-l' : ''} ${
                cell.tone === 'warning'
                  ? 'attendance-warning-card border-[var(--warning-border)] bg-[var(--warning-soft)]'
                  : ''
              }`}
            >
              <dt
                className={`font-medium ${
                  cell.tone === 'warning'
                    ? 'text-[var(--warning)]'
                    : cell.tone === 'danger'
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--muted)]'
                }`}
              >
                {cell.label}
              </dt>
              <dd
                className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                  cell.tone === 'warning'
                    ? 'text-[var(--warning)]'
                    : cell.tone === 'danger'
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--text)]'
                }`}
              >
                {cell.value}
              </dd>
              <dd className="mt-1 text-[11px] text-[var(--muted)]">{cell.note}</dd>
            </div>
          ))}
        </dl>

        <section className={panel} aria-labelledby="scan-title">
          <div className={panelHead}>
            <div>
              <h2 id="scan-title" className="text-sm font-semibold text-[var(--text)]">
                Quét cảnh báo học vụ
              </h2>
              <p className="mt-0.5 text-[var(--muted)]">
                Tìm sinh viên có GPA dưới 2.0, vắng từ 20% hoặc nợ từ 8 tín chỉ. Có thể gửi thông báo qua n8n.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-[11px] text-[var(--muted)]">
                Gửi thông báo
                <select
                  value={scanLimit}
                  disabled={isScanning}
                  onChange={(e) => setScanLimit(Number(e.target.value))}
                  className="min-h-8 rounded-md border px-2 text-xs"
                >
                  <option value={0}>Chỉ quét, chưa gửi</option>
                  <option value={1}>Tối đa 1 sinh viên</option>
                  <option value={5}>Tối đa 5 sinh viên</option>
                  <option value={20}>Tối đa 20 sinh viên</option>
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                isLoading={isScanning}
                onClick={handleScanWarnings}
              >
                {isScanning ? 'Đang quét…' : 'Quét cảnh báo'}
              </Button>
            </div>
          </div>

          <div className="px-4 py-3">
            {scanError && (
              <p className="mb-3 text-[var(--danger)]" role="alert">
                {scanError}
              </p>
            )}
            {isScanning ? (
              <div className="space-y-2" role="status" aria-label="Đang quét cảnh báo">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : scanResult ? (
              <>
                <p role="status" className="text-[var(--text)]">
                  <span className="font-mono tabular-nums">{scanResult.total_violations}</span> sinh viên cần
                  cảnh báo ·{' '}
                  {plannedDispatch === 0 ? (
                    'chỉ quét, chưa gửi thông báo.'
                  ) : (
                    <>
                      đã gửi{' '}
                      <span className="font-mono tabular-nums">
                        {scanResult.dispatched_count}/{plannedDispatch}
                      </span>{' '}
                      thông báo tới n8n.
                    </>
                  )}
                </p>
                {scanResult.dispatched_count < plannedDispatch && (
                  <p className="mt-2 text-[var(--danger)]" role="alert">
                    Một số thông báo chưa gửi được. Kiểm tra kết nối n8n trước khi gửi lại.
                  </p>
                )}
                {!scanResult.violations.length ? (
                  <p className="mt-2 text-[var(--muted)]">Không có sinh viên nào cần cảnh báo trong lần quét này.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="py-2 pr-4 font-medium">MSSV</th>
                          <th className="py-2 pr-4 font-medium">Họ tên</th>
                          <th className="py-2 pr-4 text-right font-medium">GPA</th>
                          <th className="py-2 pr-4 text-right font-medium">Vắng</th>
                          <th className="py-2 font-medium">Mức cảnh báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResult.violations.map((s) => (
                          <tr key={s.student_id} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2.5 pr-4 font-mono text-[var(--muted)]">{s.student_id}</td>
                            <td className="py-2.5 pr-4 text-[var(--text)]">{s.full_name}</td>
                            <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{s.gpa.toFixed(2)}</td>
                            <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{s.absent_rate}%</td>
                            <td className="py-2.5">{s.warning_tier.replace('TIER_', 'Mức ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[var(--muted)]">Chưa quét trong phiên này. Bấm Quét cảnh báo để xem danh sách.</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className={panel} aria-labelledby="violators-title">
            <div className={panelHead}>
              <div>
                <h2 id="violators-title" className="text-sm font-semibold text-[var(--text)]">
                  Vắng nhiều nhất
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">5 sinh viên có tỷ lệ vắng cao nhất</p>
              </div>
              <Link href="/teacher/attendance?status=PROHIBITED" className={textLink}>
                Xem danh sách cấm thi <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {violatorsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <Skeleton className="mb-1 h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </li>
                ))
              ) : topViolators.length > 0 ? (
                topViolators.map((s) => {
                  const pct = Math.round((1 - s.attendanceRate) * 100);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <span className="block truncate font-medium text-[var(--text)]">{s.fullName}</span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">
                          {s.studentId} · {s.classId}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant={s.examProhibited ? 'danger' : s.attendanceWarning ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          <span className="font-mono tabular-nums">{pct}%</span>
                          {s.examProhibited ? 'cấm thi' : 'vắng'}
                        </Badge>
                        <Link
                          href={`/teacher/students?search=${encodeURIComponent(s.studentId)}`}
                          className={textLink}
                          aria-label={`Xem hồ sơ ${s.fullName}`}
                        >
                          Hồ sơ
                        </Link>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="px-4 py-6 text-center text-[var(--muted)]">
                  Chưa có sinh viên nào vắng quá ngưỡng.
                </li>
              )}
            </ul>
          </section>

          <section className={`${panel} flex flex-col`} aria-labelledby="assistant-title">
            <div className={panelHead}>
              <div>
                <h2 id="assistant-title" className="text-sm font-semibold text-[var(--text)]">
                  Trợ lý học vụ
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">Trả lời dựa trên kho tài liệu quy chế</p>
              </div>
            </div>

            <div className="max-h-80 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {!aiResponse && !aiLoading && askedQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[var(--muted)]">
                    Đang hỏi tiếp. Trợ lý nhớ {Math.min(askedQuestions.length, 4)} câu gần nhất:
                  </p>
                  <ul className="space-y-1">
                    {askedQuestions.slice(-4).map((q, i) => (
                      <li key={i} className="rounded-md border border-[var(--border)] px-3 py-2 text-[var(--text)]">
                        {q}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setConversationId(undefined);
                      setAskedQuestions([]);
                    }}
                    className={textLink}
                  >
                    Bắt đầu hội thoại mới
                  </button>
                </div>
              )}

              {!aiResponse && !aiLoading && askedQuestions.length === 0 && (
                <div className="space-y-2">
                  <p className="text-[var(--muted)]">Câu hỏi gợi ý:</p>
                  {[
                    'Sinh viên vắng bao nhiêu phần trăm thì bị cấm thi?',
                    'Đồ án tốt nghiệp gồm những mốc nào?',
                    'Thời hạn đăng ký học phần học kỳ này?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setAiQuestion(q)}
                      className="block w-full cursor-pointer rounded-md border border-[var(--border)] px-3 py-2 text-left text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {aiLoading && (
                <div className="space-y-2" role="status" aria-label="Trợ lý đang trả lời">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}

              {aiResponse && (
                <div className="space-y-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-[var(--text)]">{aiResponse.answer}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span>
                      Độ tin cậy{' '}
                      <span className="font-mono tabular-nums text-[var(--text)]">
                        {Math.round(aiResponse.confidence_score * 100)}%
                      </span>
                    </span>
                    <span aria-hidden>·</span>
                    <span>{aiResponse.dispatched_to_n8n ? 'Qua luồng n8n' : 'Trả lời dự phòng (không qua n8n)'}</span>
                    {aiResponse.requires_human_escalation && (
                      <Badge variant="danger" size="sm">
                        Cần cán bộ xác minh
                      </Badge>
                    )}
                  </div>

                  {aiResponse.citations.length > 0 && (
                    <p className="text-[11px] text-[var(--muted)]">
                      <span className="font-medium text-[var(--text)]">Nguồn:</span> {aiResponse.citations.join(', ')}
                    </p>
                  )}

                  {aiResponse.suggested_actions && aiResponse.suggested_actions.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-medium text-[var(--text)]">Gợi ý xử lý</p>
                      <ul className="list-disc space-y-1 pl-5 text-[11px] text-[var(--text)]">
                        {aiResponse.suggested_actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setAiResponse(null);
                        setAiQuestion('');
                      }}
                      className={textLink}
                    >
                      Hỏi tiếp
                    </button>
                    {conversationId && (
                      <button
                        onClick={() => {
                          setAiResponse(null);
                          setAiQuestion('');
                          setConversationId(undefined);
                          setAskedQuestions([]);
                        }}
                        className="cursor-pointer text-xs font-medium text-[var(--muted)] hover:text-[var(--primary)]"
                      >
                        Hội thoại mới
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleAskAI} className="flex items-center gap-2 border-t border-[var(--border)] p-3">
              <label htmlFor="assistant-question" className="sr-only">
                Câu hỏi cho trợ lý
              </label>
              <input
                id="assistant-question"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Hỏi về quy chế, điểm danh, đồ án"
                className="min-h-10 flex-1 rounded-md border px-3 text-xs outline-none focus:border-[var(--primary)]"
                disabled={aiLoading}
              />
              <Button
                type="submit"
                size="md"
                disabled={!aiQuestion.trim()}
                isLoading={aiLoading}
                aria-label="Gửi câu hỏi"
                className="px-3"
              >
                {!aiLoading && <Send className="h-4 w-4" strokeWidth={1.5} />}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
};
