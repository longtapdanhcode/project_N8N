import { connection } from "next/server";
import React from 'react';
import { getDashboardKPIs } from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { OverviewContent } from '@/components/dashboard/OverviewContent';

export const instant = false;

export default async function OverviewPage() {
  await connection();
  const kpis = await getDashboardKPIs();

  return (
    <DashboardShell
      activeTitle="Tổng quan học vụ & Báo cáo KPI"
      badgeCounts={{
        attendanceWarning: kpis.examProhibitedCount,
        thesisActive: kpis.totalTheses,
      }}
    >
      <OverviewContent kpis={kpis} />
    </DashboardShell>
  );
}
