import React from 'react';
import { getDashboardKPIs } from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { SettingsContent } from '@/components/dashboard/SettingsContent';

export const instant = false;

export default async function SettingsPage() {
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Cấu hình Hệ thống & Quy chế"
      badgeCounts={{
        attendanceWarning: kpis.examProhibitedCount,
        thesisActive: kpis.totalTheses,
      }}
    >
      <SettingsContent />
    </DashboardShell>
  );
}
