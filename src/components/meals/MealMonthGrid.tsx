'use client';

import { useEffect, useMemo } from 'react';
import { monthGridDates, monthOf, WEEKDAYS_SHORT } from '@/lib/dates';
import { photoUrl } from '@/lib/mealRepo';
import type { PendingMeal } from '@/db/db';
import type { MealEntry } from '@/lib/meals';

function firstThumb(entries: MealEntry[]): string | null {
  const withPhoto = entries.find((entry) => entry.photo !== null);
  return withPhoto?.photo ? photoUrl(withPhoto.photo.thumbPath) : null;
}

function countByDate(pending: PendingMeal[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const meal of pending) counts[meal.date] = (counts[meal.date] ?? 0) + 1;
  return counts;
}

export default function MealMonthGrid({
  month,
  entries,
  pending,
  today,
  selected,
  onSelect,
}: {
  month: string;
  entries: MealEntry[];
  pending: PendingMeal[];
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const waitingUrls = useMemo(
    () => pending.map((meal) => [meal.date, URL.createObjectURL(meal.thumb)] as const),
    [pending],
  );

  useEffect(
    () => () => {
      for (const [, url] of waitingUrls) URL.revokeObjectURL(url);
    },
    [waitingUrls],
  );

  const waitingThumbs = Object.fromEntries(waitingUrls);
  const waitingCounts = countByDate(pending);
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
          const waiting = waitingCounts[date] ?? 0;
          const thumb = firstThumb(dayEntries) ?? waitingThumbs[date] ?? null;
          const outside = monthOf(date) !== month;
          const total = dayEntries.length + waiting;

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
              aria-label={
                waiting > 0
                  ? `${date}, ${total} meals, waiting to upload`
                  : `${date}, ${total} meals`
              }
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: dayEntries.length === 0 ? 0.55 : 1 }}
                />
              )}
              <span className="absolute left-1 top-1 rounded-md bg-[var(--mt-surface)] px-1 text-[10px] font-semibold text-[var(--mt-text)]">
                {Number(date.slice(8))}
              </span>
              {waiting > 0 && (
                <span
                  aria-hidden
                  className="absolute bottom-1 right-1 h-2 w-2 rounded-full"
                  style={{
                    background: 'var(--mt-accent-meals-deep)',
                    outline: '1.5px solid var(--mt-surface)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
