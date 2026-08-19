import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate } from '@/lib/calendarViews';
import { WEEKDAYS_SHORT, formatMonthYear, monthGridDates, monthOf } from '@/lib/dates';

export default function YearGrid({
  year,
  selectedDate,
  today,
  events,
  onSelect,
}: {
  year: number;
  selectedDate: string;
  today: string;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
}) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${year}-${m}`;
  });

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
      {months.map((month) => {
        const dates = monthGridDates(month);
        const counts = countsByDate(events, dates);

        return (
          <div key={month} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-[var(--mt-text)] ml-2 mb-2">
              {formatMonthYear(month)}
            </h3>
            
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS_SHORT.map((label) => (
                <span
                  key={label}
                  className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--mt-text-subtle)]"
                >
                  {label.slice(0, 1)}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {dates.map((date) => {
                const inMonth = monthOf(date) === month;
                const selected = date === selectedDate;
                const count = counts[date] ?? 0;
                const isToday = date === today;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onSelect(date)}
                    aria-pressed={selected}
                    aria-label={`${date}, ${count} events`}
                    className="relative flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs transition-colors"
                    style={{
                      background: selected ? 'var(--mt-accent)' : undefined,
                      color: selected ? 'var(--mt-accent-contrast)' : 'var(--mt-text)',
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    {isToday && !selected && (
                      <span className="absolute inset-0 m-auto flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-[var(--mt-surface)]">
                        {Number(date.slice(8))}
                      </span>
                    )}
                    {(!isToday || selected) && Number(date.slice(8))}
                    
                    {count > 0 && !selected && (
                      <span 
                        className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--mt-text-muted)]" 
                        aria-hidden
                      />
                    )}
                    {count > 0 && selected && (
                      <span 
                        className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--mt-accent-contrast)] opacity-70" 
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
