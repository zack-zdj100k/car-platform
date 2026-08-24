'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingState } from '@/components/shared/states';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';

/**
 * Client-side route guard.
 *
 * This is a convenience only: it avoids showing a page the user cannot use.
 * Authorization is enforced by the backend on every request (spec §38), so
 * bypassing this guard reveals nothing — the API simply returns 401 or 403.
 */
export function RouteGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  const allowed = isAuthenticated && (!requireAdmin || isAdmin);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAdmin, router, pathname]);

  if (isLoading) {
    return <LoadingState label={t.common.loading} className="min-h-[60vh]" />;
  }

  if (!allowed) {
    // A redirect is already in flight; render nothing rather than a flash of
    // content the user is not entitled to see.
    return <LoadingState label={t.common.loading} className="min-h-[60vh]" />;
  }

  return <>{children}</>;
}
