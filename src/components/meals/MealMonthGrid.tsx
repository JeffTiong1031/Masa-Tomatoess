'use client';

import { monthGridDates, monthOf, todayISO, WEEKDAYS_SHORT } from '@/lib/dates';
import { photoUrl } from '@/lib/mealRepo';
import type { MealEntry } from '@/lib/meals';

function firstThumb(entries: MealEntry[]): string | null {
  const withPhoto = entries.find((entry) => entry.photo !== null);
  return withPhoto?.photo ? photoUrl(withPhoto.photo.thumbPath) : null;
}

export default function MealMonthGrid({
  month,
  entries,
  selected,
  onSelect,
}: {
  month: string;
  entries: MealEntry[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today = todayISO();
  const byDate = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--mt-text-muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthGridDates(month).map((date) => {
          const dayEntries = byDate.get(date) ?? [];
          const thumb = firstThumb(dayEntries);
          const outside = monthOf(date) !== month;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={date === selected}
              className="relative aspect-square min-h-11 overflow-hidden rounded-xl"
              style={{
                background: thumb
                  ? undefined
                  : 'color-mix(in srgb, var(--mt-accent) 18%, transparent)',
                opacity: outside ? 0.35 : 1,
                outline: date === today ? '2px solid var(--mt-accent)' : undefined,
                outlineOffset: '-2px',
              }}
              aria-label={`${date}, ${dayEntries.length} meals`}
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <span className="absolute left-1 top-1 rounded-md bg-[var(--mt-surface)] px-1 text-[10px] font-semibold text-[var(--mt-text)]">
                {Number(date.slice(8))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
