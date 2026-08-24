'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SeriesPoint {
  date: string;
  count: number;
}

/**
 * Time-series bars for the admin analytics (spec §45).
 *
 * Hand-rolled SVG rather than a charting dependency: the data is a simple daily
 * count, and this keeps the bundle small and the markup accessible. The figure
 * carries a text summary and a table fallback for screen readers (spec §65).
 */
export function BarChart({
  series,
  label,
  className,
  height = 140,
}: {
  series: SeriesPoint[];
  label: string;
  className?: string;
  height?: number;
}) {
  const id = useId();
  const max = Math.max(1, ...series.map((point) => point.count));
  const total = series.reduce((sum, point) => sum + point.count, 0);

  if (series.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {label}: 0
      </p>
    );
  }

  const barWidth = 100 / series.length;

  return (
    <figure className={cn('space-y-2', className)}>
      <figcaption className="text-muted-foreground flex items-baseline justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{total}</span>
      </figcaption>

      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-labelledby={`${id}-title`}
      >
        <title id={`${id}-title`}>
          {label}: {total} across {series.length} days, peaking at {max}
        </title>
        {series.map((point, index) => {
          const barHeight = Math.max(1, (point.count / max) * (height - 4));
          return (
            <rect
              key={point.date}
              x={index * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              rx={0.8}
              className="fill-primary/75"
            />
          );
        })}
      </svg>

      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </figure>
  );
}
