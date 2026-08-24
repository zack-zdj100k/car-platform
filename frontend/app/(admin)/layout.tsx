import { AdminShell } from '@/components/admin/admin-shell';
import { RouteGuard } from '@/components/dashboard/route-guard';

/**
 * Admin-protected route group (route map 🔐).
 *
 * The guard only avoids rendering a page the user cannot use; every admin API
 * call independently verifies the ADMIN role server-side (spec §38).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAdmin>
      <AdminShell>{children}</AdminShell>
    </RouteGuard>
  );
}
