import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate, monthDots, weekDates } from '@/lib/calendarViews';
import { WEEKDAYS_SHORT } from '@/lib/dates';

export default function WeekRail({
  selectedDate,
  today,
  events,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
}) {
  const dates = weekDates(selectedDate);
  const counts = countsByDate(events, dates);

  return (
    <div className="grid grid-cols-7 gap-1">
      {dates.map((date, index) => {
        const selected = date === selectedDate;
        const dots = monthDots(counts[date]);

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            aria-pressed={selected}
            aria-label={`${WEEKDAYS_SHORT[index]} ${Number(date.slice(8))}, ${
              counts[date]
            } events`}
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-1"
            style={
              selected
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            <span className="text-[10px] font-semibold uppercase text-[var(--mt-text-subtle)]">
              {WEEKDAYS_SHORT[index].slice(0, 1)}
            </span>
            {date === today && !selected ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-xs font-semibold text-[var(--mt-surface)]">
                {Number(date.slice(8))}
              </span>
            ) : (
              <span className="text-sm text-[var(--mt-text)]">
                {Number(date.slice(8))}
              </span>
            )}
            <span className="flex h-1.5 items-center gap-0.5">
              {Array.from({ length: dots }, (_, dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--mt-text-muted)]"
                  aria-hidden
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
