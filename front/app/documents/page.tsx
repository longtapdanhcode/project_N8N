import { DashboardShell } from "@/components/layout/DashboardShell";
import { DocumentsContent } from "@/components/dashboard/DocumentsContent";

export default function DocumentsPage() {
  return (
    <DashboardShell activeTitle="Kho tài liệu học vụ">
      <DocumentsContent />
    </DashboardShell>
  );
}
