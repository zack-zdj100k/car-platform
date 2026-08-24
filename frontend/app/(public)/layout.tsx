import { SiteShell } from '@/components/layout/site-shell';

/** Public route group: home, cars, car detail, order, about. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
