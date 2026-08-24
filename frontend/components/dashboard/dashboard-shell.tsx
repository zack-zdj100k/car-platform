'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, GitCompare, Heart, LayoutDashboard, LogOut, Package, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SiteHeader } from '@/components/layout/site-header';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

/** Customer dashboard sidebar and chrome (spec §39). */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { logout } = useAuth();
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: t.dashboard.overview, icon: LayoutDashboard },
    { href: '/dashboard/favorites', label: t.dashboard.favorites, icon: Heart },
    { href: '/dashboard/recent', label: t.dashboard.recent, icon: Clock },
    { href: '/dashboard/compare', label: t.dashboard.compare, icon: GitCompare },
    { href: '/dashboard/orders', label: t.dashboard.orders, icon: Package },
    { href: '/dashboard/profile', label: t.dashboard.profile, icon: UserRound },
  ];

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#dashboard-main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-100"
      >
        {t.nav.skipToContent}
      </a>
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-5 py-8 sm:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label={t.dashboard.title} className="sticky top-24 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            ))}

            <Separator className="my-3" />

            <Button
              variant="ghost"
              className="text-muted-foreground w-full justify-start gap-2.5 px-3 font-medium"
              onClick={() => void logout()}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t.dashboard.logout}
            </Button>
          </nav>
        </aside>

        <main id="dashboard-main" className="min-w-0 flex-1">
          {/* Horizontal tab bar replaces the sidebar on small screens (spec §64) */}
          <nav
            aria-label={t.dashboard.title}
            className="border-border mb-6 -mx-5 flex gap-1 overflow-x-auto border-b px-5 pb-3 lg:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap',
                  isActive(link.href)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60',
                )}
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
