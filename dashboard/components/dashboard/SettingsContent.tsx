'use client';

import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Bell,
  Database,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Users,
  Sparkles,
  Server,
  Lock,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const SettingsContent: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [warningThreshold, setWarningThreshold] = useState(15);
  const [prohibitedThreshold, setProhibitedThreshold] = useState(20);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    showToast('Cấu hình đã được lưu thành công!');
  };

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* ============ Section: Attendance Thresholds ============ */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ngưỡng Cảnh báo Điểm danh (Quy chế VKU Điều 14)
              </h3>
              <p className="text-[11px] text-slate-400">
                Cấu hình tỷ lệ vắng kích hoạt cảnh báo tự động và lệnh cấm thi
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Warning threshold */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ngưỡng cảnh báo (%)
                </label>
                <p className="text-[11px] text-slate-400">
                  Sinh viên vắng bằng hoặc hơn tỷ lệ này sẽ bị gắn trạng thái &quot;CẢNH BÁO&quot;
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  min={5}
                  max={50}
                  className="w-20 text-center bg-slate-50 text-slate-900 text-sm font-bold rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 py-2 outline-none tabular-nums"
                />
                <span className="text-xs text-slate-500 font-medium">%</span>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Prohibited threshold */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ngưỡng cấm thi (%)
                </label>
                <p className="text-[11px] text-slate-400">
                  Sinh viên vắng quá tỷ lệ này sẽ bị cấm thi và nhận điểm F theo quy chế VKU
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={prohibitedThreshold}
                  onChange={(e) => setProhibitedThreshold(Number(e.target.value))}
                  min={10}
                  max={50}
                  className="w-20 text-center bg-slate-50 text-slate-900 text-sm font-bold rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 py-2 outline-none tabular-nums"
                />
                <span className="text-xs text-slate-500 font-medium">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Section: Integration Status ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* n8n Webhook */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">n8n Webhook Automation</h3>
                  <p className="text-[11px] text-slate-400">Gửi sự kiện điểm danh tự động</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Webhook URL</span>
                <code className="text-[11px] font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  http://localhost:5678/webhook/attendance
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trạng thái</span>
                <Badge variant={webhookEnabled ? 'success' : 'neutral'} dot size="sm">
                  {webhookEnabled ? 'Đang hoạt động' : 'Đã tắt'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lần gửi cuối</span>
                <span className="text-slate-700 font-medium">10 phút trước</span>
              </div>
            </div>
          </div>

          {/* AI Engine */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Google Gemini AI Engine</h3>
                  <p className="text-[11px] text-slate-400">RAG + Quy chế học vụ VKU</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Model</span>
                <span className="text-slate-700 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  gemini-2.5-flash
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vector Store</span>
                <span className="text-slate-700 font-medium">MongoDB Atlas (embedded)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trạng thái</span>
                <Badge variant={aiEnabled ? 'success' : 'neutral'} dot size="sm">
                  {aiEnabled ? 'Đang hoạt động' : 'Đã tắt'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Section: Academic Calendar ============ */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lịch Học kỳ & Cấu hình Hệ thống</h3>
              <p className="text-[11px] text-slate-400">Thông tin niên khóa hiện tại</p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-slate-500 block">Học kỳ</span>
                <span className="text-slate-900 font-bold">Học kỳ 1 (2026-2027)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-slate-500 block">Tổng sinh viên</span>
                <span className="text-slate-900 font-bold tabular-nums">500 sinh viên</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Server className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-slate-500 block">Backend</span>
                <span className="text-slate-900 font-bold">NestJS + MongoDB</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-slate-500 block">Xác thực</span>
                <span className="text-slate-900 font-bold">JWT + RBAC</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Save Button ============ */}
        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" />
            Lưu cấu hình
          </Button>
        </div>
      </div>
    </>
  );
};
