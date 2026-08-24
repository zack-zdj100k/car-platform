import { cn } from '@/lib/utils';

/** Consistent section rhythm and container width across every page (spec §59). */
export function Section({
  children,
  className,
  containerClassName,
  id,
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
  tone?: 'default' | 'muted' | 'dark';
}) {
  return (
    <section
      id={id}
      className={cn(
        'relative py-16 sm:py-20 lg:py-24',
        tone === 'muted' && 'bg-secondary/40',
        tone === 'dark' && 'bg-surface-dark text-surface-dark-foreground isolate overflow-hidden',
        className,
      )}
    >
      <div className={cn('relative mx-auto w-full max-w-7xl px-5 sm:px-8', containerClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'start',
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && (
        <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">{eyebrow}</p>
      )}
      <h2 className="mt-2.5 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {body && <p className="text-muted-foreground mt-4 text-base/7">{body}</p>}
    </div>
  );
}
