'use client';

import Card from '@/components/ui/Card';
import { formatShortDate, weekdayIndex } from '@/lib/dates';
import { USERS, type UserName } from '@/lib/identity';
import { intakeFor } from '@/lib/mealDay';
import { weekDates, weekStart, weekTotals } from '@/lib/mealWeek';
import type { MealEntry } from '@/lib/meals';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeekCard({
  entries,
  owner,
  today,
  onReview,
  reviewLabel,
  reviewDisabled,
}: {
  entries: MealEntry[];
  owner: UserName;
  today: string;
  onReview: () => void;
  reviewLabel: string;
  reviewDisabled: boolean;
}) {
  const week = weekDates(weekStart(today));
  const mine = weekTotals(entries, week, owner);
  const peak = Math.max(1, ...Object.values(mine.byDate));

  return (
    <Card className="mb-4">
      <div className="mb-4 grid grid-cols-2 gap-4">
        {USERS.map((user) => {
          const totals = weekTotals(entries, week, user);
          const todayTotal = intakeFor(entries, today, user);
          return (
            <div key={user}>
              <div className="text-xs text-[var(--mt-text-muted)]">{user}</div>
              <div className="text-2xl font-semibold leading-tight text-[var(--mt-text)]">
                {todayTotal.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-[var(--mt-text-muted)]">
                  kcal today
                </span>
              </div>
              <div className="text-xs text-[var(--mt-text-muted)]">
                {totals.total.toLocaleString()} this week
                {totals.dayCount > 0 && ` · ${totals.dayCount}d`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {week.map((date) => {
          const calories = mine.byDate[date] ?? 0;
          const isToday = date === today;
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <div
                className="flex h-10 w-full items-end"
                role="img"
                aria-label={`${formatShortDate(date)}: ${calories.toLocaleString()} kcal`}
              >
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(calories / peak) * 100}%`,
                    background: 'var(--mt-accent-meals-deep)',
                    opacity: isToday || calories === 0 ? 1 : 0.55,
                  }}
                />
              </div>
              <span
                aria-hidden
                className="text-[10px] leading-none"
                style={{
                  color: isToday ? 'var(--mt-text)' : 'var(--mt-text-muted)',
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {WEEKDAY_INITIALS[weekdayIndex(date)]}
              </span>
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
