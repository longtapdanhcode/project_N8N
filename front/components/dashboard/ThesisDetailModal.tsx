"use client";

import { useEffect, useRef, useState } from "react";
import type { Thesis, MilestoneStatus } from "@/types";
import { updateThesisMilestone, refreshThesis } from "@/lib/api";
import { DEFENSE_STATUS } from "@/lib/thesis-status";
import { Badge } from "@/components/ui/Badge";
import { LoaderCircle, RefreshCw, TriangleAlert, X } from "lucide-react";

const ICON = { className: "h-4 w-4 flex-shrink-0", strokeWidth: 1.5 } as const;

interface ThesisDetailModalProps {
  thesis: Thesis | null;
  onClose: () => void;
  onThesisUpdated?: (thesis: Thesis) => void;
}
export function ThesisDetailModal({
  thesis,
  onClose,
  onThesisUpdated,
}: ThesisDetailModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(thesis);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Reset local state when a different thesis is opened (adjust state during render).
  const [prevThesis, setPrevThesis] = useState(thesis);
  if (thesis !== prevThesis) {
    setPrevThesis(thesis);
    setCurrent(thesis);
    setError("");
    setNotice("");
  }
  // The effect only drives the native <dialog>, an external DOM API.
  useEffect(() => {
    if (thesis) dialog.current?.showModal();
    else dialog.current?.close();
  }, [thesis]);
  const reload = async () => {
    if (!current) return;
    const updated = await refreshThesis(current);
    setCurrent(updated);
    onThesisUpdated?.(updated);
  };
  const updateMilestone = async (milestoneId: string, status: MilestoneStatus) => {
    if (!current) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!(await updateThesisMilestone(current._id, milestoneId, status)))
        throw new Error("Chưa cập nhật được mốc.");
      await reload();
      setNotice("Đã cập nhật mốc và tải nhận xét mới nhất.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được mốc.");
    } finally {
      setBusy(false);
    }
  };

  const defense = current
    ? (DEFENSE_STATUS[current.defenseStatus ?? "NOT_ELIGIBLE"] ?? DEFENSE_STATUS.NOT_ELIGIBLE)
    : null;

  return (
    <dialog
      ref={dialog}
      className="service-dialog text-xs text-[var(--text)]"
      style={{
        width: "min(720px, calc(100vw - 32px))",
        maxHeight: "90vh",
        padding: "24px",
        overflowY: "auto",
      }}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="thesis-title"
      aria-busy={busy}
    >
      {current && defense && (
        <>
          <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[11px] tracking-wider text-[var(--muted)]">
                ĐỒ ÁN · {current.studentId}
              </p>
              <h2 id="thesis-title" className="text-base font-semibold leading-snug">
                {current.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="inline-flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <X {...ICON} />
            </button>
          </header>

          <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] text-[var(--muted)]">Sinh viên</dt>
              <dd className="mt-0.5 font-medium">
                {current.studentName || <span className="text-[var(--muted)]">Chưa có tên</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--muted)]">Giảng viên hướng dẫn</dt>
              <dd className="mt-0.5 font-medium">
                {current.advisorName || <span className="text-[var(--muted)]">Chưa phân công</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--muted)]">Tiến độ</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold tabular-nums text-[var(--primary)]">
                  {current.progressPercent}%
                </span>
                <Badge variant={defense.variant} size="sm">
                  {defense.label}
                </Badge>
              </dd>
            </div>
          </dl>

          <section className="border-t border-[var(--border)] pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-semibold">Các mốc thực hiện</h3>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Chưa tải được nhận xét.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-wait disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                Tải nhận xét mới
              </button>
            </div>

            {error && (
              <p role="alert" className="mb-3 flex items-start gap-2 text-[var(--danger)]">
                <TriangleAlert {...ICON} className={`${ICON.className} mt-px`} />
                {error}
              </p>
            )}
            {busy ? (
              <p role="status" className="mb-3 flex items-center gap-2 text-[var(--muted)]">
                <LoaderCircle {...ICON} className={`${ICON.className} animate-spin`} />
                Đang cập nhật…
              </p>
            ) : (
              notice && (
                <p role="status" className="mb-3 text-[var(--primary)]">
                  {notice}
                </p>
              )
            )}

            {!current.milestones.length ? (
              <p className="text-[var(--muted)]">Đề tài chưa có mốc thực hiện.</p>
            ) : (
              <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {current.milestones.map((m, idx) => (
                  <li key={m._id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          <span className="mr-2 font-mono text-[var(--muted)]">M{idx + 1}</span>
                          {m.title}
                        </p>
                        <p className="mt-0.5 pl-7 text-[11px] text-[var(--muted)]">
                          Hạn{" "}
                          <span className="tabular-nums">
                            {new Date(m.deadline).toLocaleDateString("vi-VN")}
                          </span>
                          {m.submittedAt && (
                            <>
                              {" · "}nộp{" "}
                              <span className="tabular-nums">
                                {new Date(m.submittedAt).toLocaleDateString("vi-VN")}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                        Trạng thái
                        <select
                          disabled={busy}
                          value={m.status}
                          onChange={(e) => updateMilestone(m._id, e.target.value as MilestoneStatus)}
                          className="min-h-8 rounded-md border px-2 text-xs"
                        >
                          <option value="PENDING">Chưa nộp</option>
                          <option value="IN_PROGRESS">Đang làm</option>
                          <option value="COMPLETED">Hoàn thành</option>
                        </select>
                      </label>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap pl-7 leading-relaxed">
                      {m.aiFeedback ? (
                        <>
                          <span className="text-[var(--muted)]">Nhận xét AI: </span>
                          {m.aiFeedback}
                        </>
                      ) : (
                        <span className="text-[var(--muted)]">Chưa có nhận xét AI cho mốc này.</span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              Nhận xét do AI đề xuất, giảng viên cần xem lại trước khi dùng.
            </p>
          </section>
        </>
      )}
    </dialog>
  );
}
