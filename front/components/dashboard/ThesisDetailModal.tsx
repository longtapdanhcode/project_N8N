"use client";

import { useEffect, useRef, useState } from "react";
import type { Thesis, MilestoneStatus } from "@/types";
import { updateThesisMilestone, refreshThesis } from "@/lib/api";

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
  useEffect(() => {
    setCurrent(thesis);
    setError("");
    setNotice("");
    if (thesis) dialog.current?.showModal();
    else dialog.current?.close();
  }, [thesis]);
  const reload = async () => {
    if (!current) return;
    const updated = await refreshThesis(current);
    setCurrent(updated);
    onThesisUpdated?.(updated);
  };
  return (
    <dialog
      ref={dialog}
      className="service-dialog service-page"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="thesis-title"
    >
      {current && (
        <>
          <div className="service-toolbar">
            <h2 id="thesis-title">Chi tiết đồ án</h2>
            <button onClick={onClose}>Đóng</button>
          </div>
          <h3>{current.title}</h3>
          <p>
            {current.studentName} · {current.studentId}
          </p>
          <p>Giảng viên hướng dẫn: {current.advisorName}</p>
          <p>
            Tiến độ: {current.progressPercent}% ·{" "}
            {current.defenseStatus === "ELIGIBLE"
              ? "Đủ điều kiện bảo vệ"
              : "Chưa đủ điều kiện bảo vệ"}
          </p>
          {error && (
            <p role="alert" className="service-error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <div className="service-toolbar">
            <h3>Các mốc thực hiện</h3>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await reload();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Chưa tải được phản hồi.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Tải phản hồi mới
            </button>
          </div>
          {!current.milestones.length && <p>Chưa có mốc thực hiện.</p>}
          <div className="service-list">
            {current.milestones.map((m) => (
              <div key={m._id}>
                <h3>{m.title}</h3>
                <label>
                  Trạng thái
                  <select
                    disabled={busy}
                    value={m.status}
                    onChange={async (e) => {
                      const status = e.target.value as MilestoneStatus;
                      setBusy(true);
                      setError("");
                      setNotice("");
                      try {
                        if (
                          !(await updateThesisMilestone(
                            current._id,
                            m._id,
                            status,
                          ))
                        )
                          throw new Error("Chưa cập nhật được mốc.");
                        await reload();
                        setNotice("Đã cập nhật mốc và tải phản hồi mới nhất.");
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Không cập nhật được mốc.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <option value="PENDING">Chưa bắt đầu</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                  </select>
                </label>
                {m.aiFeedback ? (
                  <>
                    <h3>Nhận xét AI</h3>
                    <p className="whitespace-pre-wrap">{m.aiFeedback}</p>
                  </>
                ) : (
                  <p>Chưa có nhận xét AI cho mốc này.</p>
                )}
              </div>
            ))}
          </div>
          {busy && <p role="status">Đang xử lý, vui lòng chờ…</p>}
        </>
      )}
    </dialog>
  );
}
