import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate, monthDots } from '@/lib/calendarViews';
import {
  WEEKDAYS_SHORT,
  formatMonthYear,
  monthGridDates,
  monthOf,
} from '@/lib/dates';

export default function MonthGrid({
  month,
  selectedDate,
  today,
  events,
  onSelect,
  onMonth,
}: {
  month: string;
  selectedDate: string;
  today: string;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
  onMonth: (step: -1 | 1) => void;
}) {
  const dates = monthGridDates(month);
  const counts = countsByDate(events, dates);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(-1)}
          aria-label="Previous month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => onMonth(1)}
          aria-label="Next month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

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
        {dates.map((date) => {
          const inMonth = monthOf(date) === month;
          const selected = date === selectedDate;
          const dots = monthDots(counts[date]);

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={selected}
              aria-label={`${date}, ${counts[date]} events`}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl"
              style={{
                background: selected ? 'var(--mt-accent)' : undefined,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              {date === today && !selected ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-xs font-semibold text-[var(--mt-surface)]">
                  {Number(date.slice(8))}
                </span>
              ) : (
                <span className="text-xs text-[var(--mt-text)]">
                  {Number(date.slice(8))}
                </span>
              )}
              <span className="flex h-1.5 items-center gap-0.5">
                {Array.from({ length: dots }, (_, dot) => (
                  <span
                    key={dot}
                    className="h-1 w-1 rounded-full bg-[var(--mt-text-muted)]"
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
