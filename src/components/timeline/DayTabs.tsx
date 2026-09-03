import { WEEKDAYS, WEEKDAYS_SHORT, type Weekday } from '@/lib/dates';

const DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export default function DayTabs({
  selected,
  today,
  onSelect,
}: {
  selected: Weekday;
  today: Weekday;
  onSelect: (day: Weekday) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-7 gap-1.5" role="tablist">
      {DAYS.map((day) => (
        <button
          key={day}
          type="button"
          role="tab"
          aria-selected={selected === day}
          aria-label={day === today ? `${WEEKDAYS[day]}, today` : WEEKDAYS[day]}
          onClick={() => onSelect(day)}
          className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors ${
            selected === day
              ? 'border-[var(--mt-text)] bg-[var(--mt-text)] text-[var(--mt-surface)]'
              : day === today
                ? 'border-[var(--mt-accent)] bg-[color-mix(in_srgb,var(--mt-accent)_16%,var(--mt-surface))] text-[var(--mt-text)]'
                : 'border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text-muted)]'
          }`}
        >
          {WEEKDAYS_SHORT[day]}
        </button>
      ))}
    </div>
  );
}
