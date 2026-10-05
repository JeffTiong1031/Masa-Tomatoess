'use client';

import { useRef, useState } from 'react';
import type { Entry, HandEntry } from '@/lib/finance';
import { formatRM } from '@/lib/financeMoney';
import { swipeOutcome } from '@/lib/financeSwipe';
import { entryLines } from '@/lib/financeViews';

const TAP_SLOP_PX = 6;

function amountText(entry: Entry): string {
  if (entry.kind === 'expense') return formatRM(entry.amountSen);
  return entry.amountSen < 0 ? formatRM(entry.amountSen) : `+${formatRM(entry.amountSen)}`;
}

function Body({
  entry,
  categoryName,
  fill,
}: {
  entry: Entry;
  categoryName: string;
  fill: string;
}) {
  const { title, subtitle } = entryLines(entry, categoryName);
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: fill }} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-[var(--mt-text)]">
          <span className="truncate">{title}</span>
          {entry.source === 'saving' && (
            <span className="rounded-full border border-[var(--mt-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-muted)]">
              Auto
            </span>
          )}
        </div>
        {subtitle !== null && (
          <div className="truncate text-xs text-[var(--mt-text-muted)]">{subtitle}</div>
        )}
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
  fill,
  onEdit,
  onDelete,
}: {
  entry: HandEntry;
  categoryName: string;
  fill: string;
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
        aria-label={`Edit ${entryLines(entry, categoryName).title} ${amountText(entry)}`}
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
        <Body entry={entry} categoryName={categoryName} fill={fill} />
      </div>
    </li>
  );
}

export default function EntryRow({
  entry,
  categoryName,
  fill,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  categoryName: string;
  fill: string;
  onEdit: (entry: HandEntry) => void;
  onDelete: (entry: HandEntry) => void;
}) {
  if (entry.source === 'saving') {
    return (
      <li>
        <Body entry={entry} categoryName={categoryName} fill={fill} />
      </li>
    );
  }
  return (
    <SwipeRow
      entry={entry}
      categoryName={categoryName}
      fill={fill}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
