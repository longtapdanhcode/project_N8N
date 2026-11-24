'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { MilestoneStatus, Student, StudentStatus } from '@/types';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { TriangleAlert, X } from 'lucide-react';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
}

const STUDENT_STATUS: Record<StudentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  ACTIVE: { label: 'Đang học', variant: 'primary' },
  WARNING: { label: 'Cảnh báo học vụ', variant: 'danger' },
  SUSPENDED: { label: 'Tạm dừng học', variant: 'danger' },
  GRADUATED: { label: 'Đã tốt nghiệp', variant: 'neutral' },
};

export const MILESTONE_STATUS: Record<MilestoneStatus, { label: string; variant: BadgeProps['variant'] }> = {
  COMPLETED: { label: 'Hoàn thành', variant: 'primary' },
  IN_PROGRESS: { label: 'Đang làm', variant: 'neutral' },
  PENDING: { label: 'Chưa nộp', variant: 'neutral' },
};

/** Nhãn điểm danh: luôn có chữ, màu chỉ để nhấn mạnh. */
export function attendanceLabel(s: Pick<Student, 'examProhibited' | 'attendanceWarning'>) {
  if (s.examProhibited) return { label: 'Cấm thi', variant: 'danger' as const };
  if (s.attendanceWarning) return { label: 'Cảnh báo', variant: 'warning' as const };
  return { label: 'Bình thường', variant: 'neutral' as const };
}

const ICON = { className: 'h-4 w-4 flex-shrink-0', strokeWidth: 1.5 } as const;

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (student) dialog.current?.showModal();
    else dialog.current?.close();
  }, [student]);

  if (!student) return null;

  const status = STUDENT_STATUS[student.status] ?? { label: student.status, variant: 'neutral' };
  const attendance = attendanceLabel(student);
  const absentPct = Math.round((1 - student.attendanceRate) * 100);

  const info: { label: string; value: React.ReactNode }[] = [
    { label: 'Email', value: <span className="break-all">{student.email}</span> },
    { label: 'Số điện thoại', value: <span className="font-mono">{student.phone}</span> },
    { label: 'Chuyên ngành', value: student.major },
    { label: 'Khóa', value: <span className="font-mono">{student.academicYear}</span> },
  ];

  const academic: { label: string; value: React.ReactNode; note: React.ReactNode }[] = [
    {
      label: 'GPA',
      value: student.gpa.toFixed(2),
      note: 'Thang 4.0',
    },
    {
      label: 'Tín chỉ tích lũy',
      value: (
        <>
          {student.creditsEarned}
          <span className="text-xs font-normal text-[var(--muted)]"> / {student.totalCredits}</span>
        </>
      ),
      note: 'Tín chỉ',
    },
    {
      label: 'Số tiết vắng',
      value: (
        <>
          {student.absentSessions}
          <span className="text-xs font-normal text-[var(--muted)]"> / {student.totalSessions}</span>
        </>
      ),
      note: (
        <span className="inline-flex items-center gap-2">
          <Badge variant={attendance.variant} size="sm">
            {attendance.label}
          </Badge>
          <span className="tabular-nums">{absentPct}% vắng</span>
        </span>
      ),
    },
  ];

  return (
    <dialog
      ref={dialog}
      className="service-dialog text-xs text-[var(--text)]"
      style={{
        width: 'min(720px, calc(100vw - 32px))',
        maxHeight: '90vh',
        padding: '24px',
        overflowY: 'auto',
      }}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="student-modal-title"
    >
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-[11px] tracking-wider text-[var(--muted)]">
            {student.studentId} · LỚP {student.classId}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="student-modal-title" className="text-base font-semibold leading-snug">
              {student.fullName}
            </h2>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="inline-flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          <X {...ICON} />
        </button>
      </header>

      <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {info.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[11px] text-[var(--muted)]">{label}</dt>
            <dd className="mt-0.5 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="border-t border-[var(--border)] pt-4">
        <h3 className="mb-3 text-xs font-semibold">Học vụ và điểm danh</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          {academic.map(({ label, value, note }) => (
            <div key={label}>
              <dt className="text-[11px] text-[var(--muted)]">{label}</dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{value}</dd>
              <dd className="mt-0.5 text-[11px] text-[var(--muted)]">{note}</dd>
            </div>
          ))}
        </dl>

        {student.examProhibited ? (
          <p className="mt-3 flex items-start gap-2 text-[var(--danger)]" role="note">
            <TriangleAlert {...ICON} className={`${ICON.className} mt-px`} />
            Vắng quá 20% số tiết (Điều 14): không đủ điều kiện dự thi kết thúc học phần, trừ khi Hội đồng
            khoa có quyết định khác.
          </p>
        ) : student.attendanceWarning ? (
          <p className="mt-3 text-[var(--muted)]">
            Vắng từ 15% số tiết. Gửi thông báo cho sinh viên bằng Quét cảnh báo ở{' '}
            <Link href="/teacher" className="text-[var(--primary)] underline-offset-2 hover:underline">
              Tổng quan
            </Link>
            .
          </p>
        ) : null}
      </section>

      {student.thesis && (
        <section className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold">Đồ án tốt nghiệp</h3>
            <span className="font-mono tabular-nums text-[var(--muted)]">
              Tiến độ <span className="text-[var(--primary)]">{student.thesis.progressPercent}%</span>
            </span>
          </div>
          <p className="font-medium leading-snug">{student.thesis.title}</p>
          {student.thesis.advisorName && (
            <p className="mt-1 text-[var(--muted)]">GVHD: {student.thesis.advisorName}</p>
          )}
          <ol className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {student.thesis.milestones.map((m, idx) => {
              const ms = MILESTONE_STATUS[m.status] ?? { label: m.status, variant: 'neutral' };
              return (
                <li key={m._id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      <span className="mr-2 font-mono text-[var(--muted)]">M{idx + 1}</span>
                      {m.title}
                    </span>
                    <Badge variant={ms.variant} size="sm">
                      {ms.label}
                    </Badge>
                  </div>
                  {m.aiFeedback && (
                    <p className="mt-1 pl-7 text-[11px] leading-relaxed text-[var(--muted)]">
                      <span className="text-[var(--text)]">Nhận xét AI:</span> {m.aiFeedback}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <span className="text-[11px] text-[var(--muted)]">
          Tạo hồ sơ <span className="tabular-nums">{new Date(student.createdAt).toLocaleDateString('vi-VN')}</span>
        </span>
        <button
          onClick={onClose}
          className="min-h-10 cursor-pointer rounded-md border border-[var(--border)] px-4 text-xs font-medium hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          Đóng
        </button>
      </footer>
    </dialog>
  );
};
