'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear } from '@/lib/dates';
import { monthSwipe, stepMonth, type MonthSpan } from '@/lib/financeMonths';

const arrow =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] disabled:text-[var(--mt-text-subtle)] disabled:hover:bg-transparent';

export default function MonthPicker({
  month,
  span,
  onChange,
}: {
  month: string;
  span: MonthSpan;
  onChange: (next: string) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const finish = (x: number, y: number) => {
    if (start.current === null) return;
    const step = monthSwipe(x - start.current.x, y - start.current.y);
    start.current = null;
    if (step !== 0) onChange(stepMonth(month, step, span));
  };

  return (
    <div
      className="mt-soft grid touch-pan-y select-none grid-cols-[auto_1fr_auto] items-center px-2 py-1"
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => finish(event.clientX, event.clientY)}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      <button
        type="button"
        aria-label="Previous month"
        disabled={month === span.first}
        onClick={() => onChange(stepMonth(month, -1, span))}
        className={arrow}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>
      <div className="text-center text-base font-semibold text-[var(--mt-text)]" aria-live="polite">
        {formatMonthYear(month)}
      </div>
      <button
        type="button"
        aria-label="Next month"
        disabled={month === span.last}
        onClick={() => onChange(stepMonth(month, 1, span))}
        className={arrow}
      >
        <ChevronRight size={20} aria-hidden />
      </button>
    </div>
  );
}
