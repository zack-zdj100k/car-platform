'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Car, LayoutDashboard, Package, Settings, Users } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/** Admin chrome (spec §45). Every page behind it is also guarded server-side. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();

  const links = [
    { href: '/admin/dashboard', label: t.admin.overview, icon: LayoutDashboard },
    { href: '/admin/cars', label: t.admin.cars, icon: Car },
    { href: '/admin/orders', label: t.admin.orders, icon: Package },
    { href: '/admin/users', label: t.admin.users, icon: Users },
    { href: '/admin/analytics', label: t.admin.analytics, icon: BarChart3 },
    { href: '/admin/settings', label: t.admin.settings, icon: Settings },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#admin-main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-100"
      >
        {t.nav.skipToContent}
      </a>
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-[100rem] flex-1 gap-8 px-5 py-8 sm:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label={t.admin.title} className="sticky top-24 space-y-1">
            <p className="text-muted-foreground px-3 pb-2 text-xs font-semibold tracking-widest uppercase">
              {t.admin.title}
            </p>
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
          </nav>
        </aside>

        <main id="admin-main" className="min-w-0 flex-1">
          <nav
            aria-label={t.admin.title}
            className="border-border mb-6 -mx-5 flex gap-1 overflow-x-auto border-b px-5 pb-3 lg:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap',
                  isActive(link.href) ? 'bg-secondary text-foreground' : 'text-muted-foreground',
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
