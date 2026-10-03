'use client';

import { useRef, useState } from 'react';
import { formatShortDate } from '@/lib/dates';
import type { Entry, HandEntry } from '@/lib/finance';
import { formatRM } from '@/lib/financeMoney';
import { swipeOutcome } from '@/lib/financeSwipe';

const TAP_SLOP_PX = 6;

function amountText(entry: Entry): string {
  if (entry.kind === 'expense') return formatRM(entry.amountSen);
  return entry.amountSen < 0 ? formatRM(entry.amountSen) : `+${formatRM(entry.amountSen)}`;
}

function Body({ entry, categoryName }: { entry: Entry; categoryName: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-[var(--mt-text)]">
          <span className="truncate">{categoryName}</span>
          {entry.source === 'saving' && (
            <span className="rounded-full border border-[var(--mt-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-muted)]">
              Auto
            </span>
          )}
        </div>
        <div className="truncate text-xs text-[var(--mt-text-muted)]">
          {entry.source === 'saving'
            ? `Budget ${formatShortDate(entry.periodStart)} – ${formatShortDate(entry.date)}`
            : [entry.kind === 'income' ? 'Income' : null, entry.note].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums text-[var(--mt-text)]">
        {amountText(entry)}
      </span>
    </div>
  );
}

function SwipeRow({
  entry,
  categoryName,
  onEdit,
  onDelete,
}: {
  entry: HandEntry;
  categoryName: string;
  onEdit: (entry: HandEntry) => void;
  onDelete: (entry: HandEntry) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);

  const release = (x: number, y: number, width: number) => {
    if (start.current === null) return;
    const dx = x - start.current.x;
    const dy = y - start.current.y;
    start.current = null;
    setOffset(0);
    if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) {
      onEdit(entry);
      return;
    }
    if (swipeOutcome(dx, dy, width) === 'delete') onDelete(entry);
  };

  return (
    <li className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-end bg-[var(--mt-danger)] px-4 text-sm font-semibold text-[var(--mt-danger-contrast)]"
      >
        Delete
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Edit ${categoryName} ${amountText(entry)}`}
        className={`relative touch-pan-y select-none bg-[var(--mt-surface)] ${offset === 0 ? 'transition-transform' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onEdit(entry);
          }
        }}
        onPointerDown={(event) => {
          start.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (start.current === null) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          setOffset(swipeOutcome(dx, dy, Infinity) === 'scroll' ? 0 : Math.min(dx, 0));
        }}
        onPointerUp={(event) =>
          release(event.clientX, event.clientY, event.currentTarget.clientWidth)
        }
        onPointerCancel={() => {
          start.current = null;
          setOffset(0);
        }}
      >
        <Body entry={entry} categoryName={categoryName} />
      </div>
    </li>
  );
}

export default function EntryRow({
  entry,
  categoryName,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  categoryName: string;
  onEdit: (entry: HandEntry) => void;
  onDelete: (entry: HandEntry) => void;
}) {
  if (entry.source === 'saving') {
    return (
      <li>
        <Body entry={entry} categoryName={categoryName} />
      </li>
    );
  }
  return <SwipeRow entry={entry} categoryName={categoryName} onEdit={onEdit} onDelete={onDelete} />;
}
