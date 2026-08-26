'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Scroll reveal (spec §9, §12 — "subtle and performant").
 *
 * Honours `prefers-reduced-motion` by rendering the content statically rather
 * than animating it (spec §8, §65).
 */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      // Marks an entrance the accessibility audit must let finish before it
      // measures contrast — text half-way through a fade really is low
      // contrast, and auditing that frame reported failures nobody could see.
      data-entrance
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
