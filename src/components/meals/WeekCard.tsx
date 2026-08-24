'use client';

import Card from '@/components/ui/Card';
import { formatShortDate } from '@/lib/dates';
import { USERS, type UserName } from '@/lib/identity';
import { sealedDates, weekDates, weekStart, weekTotals } from '@/lib/mealWeek';
import type { MealDay, MealEntry } from '@/lib/meals';

export default function WeekCard({
  entries,
  days,
  owner,
  today,
  onReview,
  reviewLabel,
  reviewDisabled,
}: {
  entries: MealEntry[];
  days: MealDay[];
  owner: UserName;
  today: string;
  onReview: () => void;
  reviewLabel: string;
  reviewDisabled: boolean;
}) {
  const week = weekDates(weekStart(today));
  const mine = weekTotals(entries, sealedDates(days, week, owner), owner);
  const peak = Math.max(1, ...Object.values(mine.byDate));

  return (
    <Card className="mb-4">
      <div className="mb-3 flex gap-6">
        {USERS.map((user) => {
          const totals = weekTotals(entries, sealedDates(days, week, user), user);
          return (
            <div key={user}>
              <div className="text-xs text-[var(--mt-text-muted)]">{user}</div>
              <div className="text-lg font-semibold text-[var(--mt-text)]">
                {totals.total.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-[var(--mt-text-muted)]">
                  kcal · {totals.sealedCount}d
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {week.map((date) => {
          const calories = mine.byDate[date] ?? 0;
          return (
            <div
              key={date}
              className="flex h-10 items-end"
              role="img"
              aria-label={`${formatShortDate(date)}: ${calories.toLocaleString()} kcal`}
            >
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(calories / peak) * 100}%`,
                  background: 'var(--mt-accent-meals-deep)',
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onReview}
        disabled={reviewDisabled}
        className="min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-60"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
      >
        {reviewLabel}
      </button>
    </Card>
  );
}
