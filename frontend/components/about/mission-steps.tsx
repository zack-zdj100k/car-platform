'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The four steps of the mission (spec §30), as a journey rather than a row of
 * boxes: a line draws itself between them, each step rises into place in turn,
 * and every icon keeps a small movement of its own that says what it does — the
 * compass sweeps, the comparison arrows trade places, the eye searches, the
 * pointer clicks.
 *
 * All of it is idle motion, which is exactly the kind that has to stop for
 * anyone who asks it to: under `prefers-reduced-motion` the loops do not run,
 * the line is simply drawn, and the steps are simply there.
 */

export interface MissionStep {
  icon: LucideIcon;
  label: string;
}

/** One loop per step, so the four never move in unison. */
const IDLE: Variants[] = [
  // Discover — a compass sweeping for a bearing.
  { rest: { rotate: 0 }, idle: { rotate: [-14, 14, -14], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } } },
  // Compare — two things trading places.
  { rest: { x: 0 }, idle: { x: [-3, 3, -3], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } } },
  // Explore — an eye widening.
  { rest: { scale: 1 }, idle: { scale: [1, 1.12, 1], transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } } },
  // Choose — a decisive press.
  {
    rest: { scale: 1, y: 0 },
    idle: { scale: [1, 0.88, 1], y: [0, 1, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.3] } },
  },
];

export function MissionSteps({ steps, className }: { steps: MissionStep[]; className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={cn('relative', className)}>
      {/*
        The thread running through the steps. It sits behind them, only on the
        wide layout where they actually form a row, and draws itself once.
      */}
      <motion.span
        aria-hidden="true"
        className="via-primary/40 pointer-events-none absolute top-[3.4rem] right-[12%] left-[12%] hidden h-px origin-left bg-gradient-to-r from-transparent to-transparent lg:block"
        initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <ol className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <motion.li
              key={step.label}
              data-entrance
              className="group border-border bg-card relative flex flex-col items-center gap-3 rounded-xl border p-6 text-center shadow-[var(--shadow-card)]"
              initial={reduced ? undefined : { opacity: 0, y: 18 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={reduced ? undefined : { y: -6 }}
            >
              <span
                aria-hidden="true"
                // Full token, no alpha: at 70% the number measured 3.61:1 on the card,
                // under the 4.5:1 minimum. Being decorative does not exempt it —
                // it is still text somebody has to look at.
                className="text-muted-foreground absolute top-3 end-3.5 font-mono text-[11px] tabular-nums"
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <span className="relative grid size-12 place-items-center">
                {/* A halo that opens outwards when the step is pointed at. */}
                <motion.span
                  aria-hidden="true"
                  className="bg-primary/15 absolute inset-0 rounded-full"
                  initial={{ scale: 1, opacity: 0.65 }}
                  whileHover={reduced ? undefined : { scale: 1.45, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                <span className="bg-primary/10 text-primary relative grid size-11 place-items-center rounded-full transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <motion.span
                    className="grid place-items-center"
                    variants={IDLE[index % IDLE.length]}
                    initial="rest"
                    animate={reduced ? 'rest' : 'idle'}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </motion.span>
                </span>
              </span>

              <span className="font-display font-semibold">{step.label}</span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export default MissionSteps;
