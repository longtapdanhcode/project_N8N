'use client';

import React, { useState } from 'react';
import { Thesis, MilestoneStatus } from '@/types';
import { Badge, Button } from '@/components/ui';
import {
  X,
  BookOpen,
  User,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';
import { updateThesisMilestone } from '@/lib/api';

interface ThesisDetailModalProps {
  thesis: Thesis | null;
  onClose: () => void;
  onThesisUpdated?: (updatedThesis: Thesis) => void;
}

export const ThesisDetailModal: React.FC<ThesisDetailModalProps> = ({
  thesis,
  onClose,
  onThesisUpdated,
}) => {
  const [currentThesis, setCurrentThesis] = useState<Thesis | null>(thesis);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<string | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentThesis(thesis);
  }, [thesis]);

  if (!currentThesis) return null;

  const isEligible = currentThesis.defenseStatus === 'ELIGIBLE';

  const handleStatusChange = async (milestoneId: string, newStatus: MilestoneStatus) => {
    setUpdatingMilestoneId(milestoneId);
    try {
      const ok = await updateThesisMilestone(currentThesis._id, milestoneId, newStatus);
      if (ok) {
        const updatedMilestones = currentThesis.milestones.map((m) =>
          m._id === milestoneId ? { ...m, status: newStatus } : m
        );
        const completed = updatedMilestones.filter((m) => m.status === 'COMPLETED').length;
        const progressPercent = Math.round((completed / updatedMilestones.length) * 100);
        const updated: Thesis = {
          ...currentThesis,
          milestones: updatedMilestones,
          progressPercent,
          defenseStatus: progressPercent >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
          updatedAt: new Date().toISOString(),
        };
        setCurrentThesis(updated);
        if (onThesisUpdated) onThesisUpdated(updated);

        setSavedSuccessMessage(`Đã cập nhật trạng thái mốc thành công!`);
        setTimeout(() => setSavedSuccessMessage(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Chi tiết Đề tài Đồ án</h2>
                <Badge variant={isEligible ? 'success' : 'primary'} dot size="sm">
                  {isEligible ? 'ĐỦ ĐIỀU KIỆN BV' : 'ĐANG THỰC HIỆN'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Mã đề tài: <span className="font-semibold text-slate-700">{currentThesis._id}</span>
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Success Banner */}
          {savedSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{savedSuccessMessage}</span>
            </div>
          )}

          {/* Thesis Title & Department */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {currentThesis.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                {currentThesis.department}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                GVHD: <strong>{currentThesis.advisorName}</strong>
              </span>
            </div>
          </div>

          {/* Student & Progress Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Sinh viên thực hiện
              </span>
              <p className="font-bold text-slate-900 mt-1 text-sm">
                {currentThesis.studentName || 'Sinh viên VKU'}
              </p>
              <span className="font-mono text-slate-500 text-[11px] block mt-0.5">
                MSSV: {currentThesis.studentId}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Tiến độ thẩm định
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-blue-600 tabular-nums">
                  {currentThesis.progressPercent}%
                </span>
                <span className="text-slate-500 text-[11px]">
                  ({currentThesis.milestones.filter((m) => m.status === 'COMPLETED').length}/
                  {currentThesis.milestones.length} mốc)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${currentThesis.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestones Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                4 Cột mốc thực hiện & Thẩm định AI
              </h4>
              <span className="text-[11px] text-slate-500">
                Nhấp vào trạng thái để thay đổi
              </span>
            </div>

            <div className="space-y-3">
              {currentThesis.milestones.map((m, idx) => (
                <div
                  key={m._id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {m.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 text-xs">
                          Mốc {idx + 1}: {m.title}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>
                            Hạn nộp:{' '}
                            {m.deadline
                              ? new Date(m.deadline).toLocaleDateString('vi-VN')
                              : 'Chưa đặt'}
                          </span>
                          {m.submissionUrl && (
                            <a
                              href={m.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Báo cáo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={m.status}
                        disabled={updatingMilestoneId === m._id}
                        onChange={(e) =>
                          handleStatusChange(m._id, e.target.value as MilestoneStatus)
                        }
                        className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors cursor-pointer outline-none ${
                          m.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="IN_PROGRESS">Đang thực hiện</option>
                        <option value="COMPLETED">Đã hoàn thành</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Feedback Box */}
                  {m.aiFeedback && (
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] block text-blue-800">
                          Phân tích thẩm định tự động (AI Gemini):
                        </span>
                        <p className="mt-0.5 leading-relaxed text-[11px]">{m.aiFeedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Cập nhật lần cuối: {new Date(currentThesis.updatedAt).toLocaleDateString('vi-VN')}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
