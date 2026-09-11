import Link from 'next/link';
import type { Agenda } from '@/lib/todayAgenda';
import type { MonthCell } from '@/lib/monthGrid';
import { accentVar } from '@/components/ui/PageShell';
import {
  WEEKDAYS,
  WEEKDAYS_SHORT,
  formatMonthYear,
  weekdayIndex,
} from '@/lib/dates';

function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${formatMonthYear(`${year}-${`${month}`.padStart(2, '0')}`)}`;
}

export default function TodayCalendarCard({
  today,
  agenda,
  cells,
}: {
  today: string;
  agenda: Agenda;
  cells: MonthCell[];
}) {
  return (
    <section
      className="mt-soft mb-6 grid grid-cols-1 gap-6 p-5 sm:grid-cols-2"
      style={{ ['--mt-accent' as string]: accentVar('calendar') }}
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {WEEKDAYS[weekdayIndex(today)]}
        </h2>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          {longDate(today)}
        </p>

        <div className="my-4 h-px bg-[var(--mt-border)]" />

        {agenda.items.length === 0 ? (
          <p className="text-sm text-[var(--mt-text-muted)]">Nothing today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agenda.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className="inline-flex min-w-16 shrink-0 justify-center rounded-full px-2 py-1 text-xs font-semibold text-[var(--mt-text)]"
                  style={{
                    background:
                      item.kind === 'todo' && item.late
                        ? 'color-mix(in srgb, var(--mt-danger) 16%, transparent)'
                        : 'color-mix(in srgb, var(--mt-accent) 40%, transparent)',
                  }}
                >
                  {item.chip}
                </span>
                <span className="truncate text-sm text-[var(--mt-text)]">
                  {item.title}
                </span>
                {item.kind === 'todo' && item.late && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--mt-danger)' }}
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {agenda.hiddenCount > 0 && (
          <Link
            href={agenda.moreHref}
            className="mt-3 inline-flex min-h-11 items-center text-sm text-[var(--mt-text-muted)]"
          >
            +{agenda.hiddenCount} more
          </Link>
        )}
      </div>

      <div>
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
          {cells.map((cell) => (
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
                  cell.isToday ? { background: 'var(--mt-accent)' } : undefined
                }
              >
                {cell.day}
              </span>
              <span className="flex h-1.5 items-center">
                {cell.hasItems && (
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--mt-text-muted)' }}
                    aria-hidden
                  />
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
