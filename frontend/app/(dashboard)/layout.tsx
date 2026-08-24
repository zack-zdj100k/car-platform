import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { RouteGuard } from '@/components/dashboard/route-guard';

/** Customer-protected route group (spec §38, route map 🔒). */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <DashboardShell>{children}</DashboardShell>
    </RouteGuard>
  );
}
