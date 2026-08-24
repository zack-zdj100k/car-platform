'use client';

import Link from 'next/link';
import { Clock, GitCompare, Heart, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/providers/locale-provider';
import type { DashboardOverview } from '@/types/api';

/** Spec §40 — the four summary cards, all database-driven. */
export function SummaryCards({ summary }: { summary: DashboardOverview['summary'] }) {
  const { t } = useLocale();

  const cards = [
    { href: '/dashboard/favorites', label: t.dashboard.favorites, value: summary.favorites, icon: Heart },
    { href: '/dashboard/recent', label: t.dashboard.recent, value: summary.recentlyViewed, icon: Clock },
    {
      href: '/dashboard/compare',
      label: t.dashboard.savedComparisons,
      value: summary.savedComparisons,
      icon: GitCompare,
    },
    { href: '/dashboard/orders', label: t.dashboard.orders, value: summary.orders, icon: Package },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.href} href={card.href} className="group rounded-xl">
          <Card className="h-full transition-shadow group-hover:shadow-[var(--shadow-lifted)]">
            <CardContent className="flex flex-col gap-2">
              <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
                <card.icon className="size-4.5" aria-hidden="true" />
              </span>
              <p className="font-display text-2xl font-semibold">{card.value}</p>
              <p className="text-muted-foreground text-sm">{card.label}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
