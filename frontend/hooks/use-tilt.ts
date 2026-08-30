'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * A card that leans very slightly towards the cursor.
 *
 * Three degrees, which is about as much as can be added before it stops reading
 * as depth and starts reading as a gimmick. The point is that the card feels
 * like an object rather than a rectangle; anything more and a catalogue of
 * sixteen of them becomes seasickness.
 *
 * Deliberate details:
 *
 *   - **Pointer devices only.** A finger has no hover, and on a phone the
 *     effect would fire on tap and leave the card leaning after it.
 *   - **Nothing under reduced motion.** Both the media query and its later
 *     changes, so turning the preference on settles the cards immediately.
 *   - **Written in an animation frame.** Pointer events arrive faster than the
 *     screen refreshes; without this the style is recalculated several times
 *     per frame for a picture that is drawn once.
 *   - **No React state.** State would re-render the whole card on every mouse
 *     movement — the transform is set on the element directly instead.
 */

const MAX_DEGREES = 3;

export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);
  const enabled = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      enabled.current = fine.matches && !still.matches;
      if (!enabled.current && ref.current) ref.current.style.transform = '';
    };

    update();
    fine.addEventListener('change', update);
    still.addEventListener('change', update);

    return () => {
      fine.removeEventListener('change', update);
      still.removeEventListener('change', update);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current;
    if (!element || !enabled.current || event.pointerType !== 'mouse') return;

    const rect = element.getBoundingClientRect();
    // −0.5 … 0.5 from the centre of the card.
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      // Leaning *towards* the cursor: the near edge dips, so the far edge lifts.
      element.style.transform =
        `perspective(900px) rotateX(${(-y * MAX_DEGREES * 2).toFixed(2)}deg) ` +
        `rotateY(${(x * MAX_DEGREES * 2).toFixed(2)}deg) translateY(-2px)`;
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    element.style.transform = '';
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
