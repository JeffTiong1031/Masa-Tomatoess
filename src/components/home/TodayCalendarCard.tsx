import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { MonthCell } from '@/lib/monthGrid';
import { accentVar } from '@/components/ui/PageShell';
import { WEEKDAYS_SHORT, formatMonthYear, monthOf } from '@/lib/dates';
import { busyDotAccent } from '@/lib/homeField';

export default function TodayCalendarCard({
  today,
  cells,
  listedCount,
}: {
  today: string;
  cells: MonthCell[];
  listedCount: number;
}) {
  let busyIndex = 0;

  return (
    <section
      className="mt-soft overflow-hidden"
      style={{ ['--mt-accent' as string]: accentVar('calendar') }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{
          background:
            'color-mix(in srgb, var(--mt-accent) 22%, var(--mt-surface))',
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mt-accent)]">
            <CalendarDays
              size={20}
              strokeWidth={1.9}
              aria-hidden
              className="text-[var(--mt-accent-contrast)]"
            />
          </span>
          <h2 className="truncate text-base font-semibold tracking-tight text-[var(--mt-text)]">
            {formatMonthYear(monthOf(today))}
          </h2>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-[var(--mt-text)] bg-[var(--mt-surface)]">
          {listedCount > 0
            ? `${listedCount} on the list`
            : 'Nothing today'}
        </span>
      </div>

      <div className="p-5">
        <div className="mb-2 grid grid-cols-7">
          {WEEKDAYS_SHORT.map((label) => (
            <span
              key={label}
              className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--mt-text-subtle)]"
            >
              {label.slice(0, 1)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dotAccent = cell.hasItems
              ? busyDotAccent(busyIndex++)
              : null;

            return (
              <Link
                key={cell.date}
                href={`/calendar?date=${cell.date}`}
                aria-label={cell.date}
                aria-current={cell.isToday ? 'date' : undefined}
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl"
                style={{ opacity: cell.inMonth ? 1 : 0.35 }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-[var(--mt-text)]"
                  style={
                    cell.isToday
                      ? { background: 'var(--mt-accent)' }
                      : undefined
                  }
                >
                  {cell.day}
                </span>
                <span className="flex h-1.5 items-center">
                  {dotAccent ? (
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ background: accentVar(dotAccent) }}
                      aria-hidden
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
