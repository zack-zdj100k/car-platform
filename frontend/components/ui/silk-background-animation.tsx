'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * The silk backdrop: a slow, woven pattern drawn behind the whole site.
 *
 * Departures from the reference implementation, every one of them load-bearing:
 *
 *   1. It draws small and is scaled up by the compositor. The reference sizes
 *      the canvas to the window and writes every second pixel by hand: at
 *      1440×900 that is a third of a million pixels rebuilt in JavaScript on
 *      the main thread, sixty times a second, for a decorative background. Here
 *      the pattern is drawn at a fixed 192px-wide buffer and stretched by CSS,
 *      which looks the same once blurred and costs about a thousandth as much.
 *
 *   2. It reuses one buffer. The reference calls `createImageData` every frame,
 *      handing the garbage collector a new multi-megabyte array sixty times a
 *      second.
 *
 *   3. It runs at 20 frames a second, not as fast as the machine allows. Silk
 *      moving this slowly is indistinguishable at 60fps, and a background has
 *      no business competing with the page for frames.
 *
 *   4. It stops when it cannot be seen — a hidden tab, or a `prefers-reduced-
 *      motion` request, where it draws one still frame and leaves it.
 *
 *   5. It is decorative and says so: `aria-hidden`, `pointer-events-none`, and
 *      it never touches `html`/`body` styles the way the reference does — that
 *      global `overflow-x: hidden` and serif font would reach every page on the
 *      site.
 */

/** Small buffer, stretched by the compositor. Cheap, and blurs pleasantly. */
const BUFFER_WIDTH = 192;
const BUFFER_HEIGHT = 108;
const FRAME_MS = 50;

export function SilkBackgroundAnimation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = BUFFER_WIDTH;
    canvas.height = BUFFER_HEIGHT;

    const frame = context.createImageData(BUFFER_WIDTH, BUFFER_HEIGHT);
    const pixels = frame.data;

    // The reference's noise: cheap, deterministic, and quite good enough under
    // a blur. Kept as-is so the texture matches.
    const noise = (x: number, y: number) => {
      const g = 2.71828;
      const rx = g * Math.sin(g * x);
      const ry = g * Math.sin(g * y);
      return (rx * ry * (1 + x)) % 1;
    };

    let time = 0;
    let raf = 0;
    let last = 0;
    let stopped = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      const offset = 0.02 * time;

      for (let y = 0; y < BUFFER_HEIGHT; y += 1) {
        const v = (y / BUFFER_HEIGHT) * 2;

        for (let x = 0; x < BUFFER_WIDTH; x += 1) {
          const u = (x / BUFFER_WIDTH) * 2;
          const texX = u;
          const texY = v + 0.03 * Math.sin(8 * texX - offset);

          const pattern =
            0.6 +
            0.4 *
              Math.sin(
                5 * (texX + texY + Math.cos(3 * texX + 5 * texY) + 0.02 * offset) +
                  Math.sin(20 * (texX + texY - 0.1 * offset)),
              );

          const intensity = Math.max(0, pattern - (noise(x, y) / 15) * 0.8);
          const index = (y * BUFFER_WIDTH + x) * 4;

          // The reference's purple-grey, on the project's violet side.
          pixels[index] = 123 * intensity;
          pixels[index + 1] = 116 * intensity;
          pixels[index + 2] = 129 * intensity;
          pixels[index + 3] = 255;
        }
      }

      context.putImageData(frame, 0, 0);
    };

    const loop = (now: number) => {
      if (stopped) return;
      if (now - last >= FRAME_MS) {
        last = now;
        time += 1;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    draw();

    if (!reduced) {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      if (reduced) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 -z-10', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-70 blur-[2px]"
        style={{ imageRendering: 'auto' }}
      />
      {/* Depth, and a floor dark enough for the page's text to sit on. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent,oklch(0.12_0.02_294/0.75))]" />
    </div>
  );
}

export default SilkBackgroundAnimation;
