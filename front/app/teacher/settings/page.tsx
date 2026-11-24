import { connection } from "next/server";
import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { SettingsContent } from '@/components/dashboard/SettingsContent';

export const instant = false;

export default async function SettingsPage() {
  await connection();

  return (
    <DashboardShell
      activeTitle="Cài đặt"
    >
      <SettingsContent />
    </DashboardShell>
  );
}
