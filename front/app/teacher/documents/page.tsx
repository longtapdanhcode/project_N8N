import { DashboardShell } from "@/components/layout/DashboardShell";
import { DocumentsContent } from "@/components/dashboard/DocumentsContent";

export default function DocumentsPage() {
  return (
    <DashboardShell activeTitle="Tài liệu">
      <DocumentsContent />
    </DashboardShell>
  );
}
