import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Spec §73 — seeded vehicles must never read as verified production inventory.
 * Rendered wherever a car flagged `isDemoData` is displayed.
 */
export function DemoBadge({ label, className }: { label: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('border-warning/40 bg-warning/10 text-warning-foreground gap-1 font-medium', className)}
    >
      <FlaskConical className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
