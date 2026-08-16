import { Pencil } from 'lucide-react';
import type { HistoryRow } from '@/lib/cycleCalendar';
import { formatShortDate } from '@/lib/cycleDates';

const MAX_ROWS = 12;

function rangeLabel(row: HistoryRow): string {
  if (row.endDate === null) return `${formatShortDate(row.startDate)} – ongoing`;
  return `${formatShortDate(row.startDate)} – ${formatShortDate(row.endDate)}`;
}

function detailLabel(row: HistoryRow): string {
  const parts: string[] = [];
  if (row.days !== null) {
    parts.push(row.days === 1 ? '1 day' : `${row.days} days`);
  }
  if (row.cycleLength !== null) parts.push(`${row.cycleLength}-day cycle`);
  return parts.join(' · ');
}

export default function PeriodHistory({
  rows,
  onEdit,
}: {
  rows: HistoryRow[];
  onEdit: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--mt-text-muted)]">
        Nothing logged yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--mt-border)]">
      {rows.slice(0, MAX_ROWS).map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onEdit(row.id)}
            className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-[var(--mt-text)]">
                {rangeLabel(row)}
              </span>
              <span className="text-xs text-[var(--mt-text-muted)]">
                {detailLabel(row)}
              </span>
            </span>
            <Pencil size={16} className="text-[var(--mt-text-subtle)]" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
