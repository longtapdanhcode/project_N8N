import React from 'react';
import { Info } from 'lucide-react';

/*
 * Trang chỉ đọc: các ngưỡng dưới đây đang được backend áp dụng cố định
 * (attendance.service.ts, academic-warning.service.ts, thesis.service.ts).
 * Cổng giảng viên chưa có API đổi cấu hình, nên không hiện ô nhập hay nút lưu.
 */
const SECTIONS: {
  id: string;
  title: string;
  description: string;
  rows: { label: string; value: React.ReactNode }[];
}[] = [
  {
    id: 'attendance',
    title: 'Điểm danh (Điều 14 quy chế)',
    description: 'Tính trên từng học phần, theo số tiết vắng so với tổng số tiết.',
    rows: [
      { label: 'Cảnh báo', value: <>Vắng từ <Num>15%</Num> số tiết</> },
      { label: 'Cấm thi', value: <>Vắng trên <Num>20%</Num> số tiết</> },
    ],
  },
  {
    id: 'academic-warning',
    title: 'Quét cảnh báo học vụ',
    description: 'Áp dụng khi bấm Quét cảnh báo ở trang Tổng quan. Chỉ cần thỏa một điều kiện.',
    rows: [
      { label: 'Điểm trung bình', value: <>GPA dưới <Num>2.0</Num></> },
      { label: 'Vắng học', value: <>Từ <Num>20%</Num> số tiết</> },
      { label: 'Nợ tín chỉ', value: <>Từ <Num>8</Num> tín chỉ trở lên</> },
    ],
  },
  {
    id: 'thesis',
    title: 'Đồ án tốt nghiệp',
    description: 'Cập nhật mỗi khi giảng viên đổi trạng thái một mốc.',
    rows: [
      { label: 'Tiến độ', value: 'Số mốc hoàn thành chia cho tổng số mốc của đề tài' },
      { label: 'Đủ điều kiện bảo vệ', value: <>Tiến độ từ <Num>75%</Num></> },
    ],
  },
  {
    id: 'services',
    title: 'Dịch vụ liên kết',
    description: 'Địa chỉ, khóa và mô hình đặt trong cấu hình máy chủ, không hiện ở cổng.',
    rows: [
      { label: 'Tự động hóa', value: 'Workflow n8n: điểm danh, đăng ký học phần, cảnh báo học vụ, hỏi đáp, chấm bài, đồ án' },
      { label: 'Trợ lý và chấm bài', value: <>Google Gemini, mô hình theo biến <Code>GEMINI_MODEL</Code></> },
      { label: 'Kho tài liệu tra cứu', value: 'Supabase pgvector' },
      { label: 'Đăng nhập', value: 'Phiên cookie ký HMAC, khóa cổng riêng khi gọi backend' },
    ],
  },
];

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums text-[var(--primary)]">{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[11px] text-[var(--text)]">{children}</code>;
}

export const SettingsContent: React.FC = () => (
  <div className="space-y-6 text-xs">
    <p className="flex items-start gap-2 text-[var(--muted)]">
      <Info className="mt-px h-4 w-4 shrink-0" strokeWidth={1.5} />
      Các quy tắc hệ thống đang áp dụng. Muốn thay đổi, cần sửa cấu hình backend; trang này chỉ để xem.
    </p>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`settings-${section.id}`}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 id={`settings-${section.id}`} className="text-sm font-semibold text-[var(--text)]">
              {section.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">{section.description}</p>
          </div>
          <dl className="divide-y divide-[var(--border)]">
            {section.rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 px-4 py-3">
                <dt className="text-[var(--muted)]">{row.label}</dt>
                <dd className="text-[var(--text)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  </div>
);
