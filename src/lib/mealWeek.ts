import { addDays, weekdayIndex } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import type { MealDay, MealEntry, WeekTotals } from '@/lib/meals';

export function weekStart(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sealedDates(
  days: MealDay[],
  week: string[],
  owner: UserName,
): string[] {
  const sealed = new Set(
    days.filter((day) => day.owner === owner && day.sealed).map((day) => day.date),
  );
  return week.filter((date) => sealed.has(date));
}

export function weekTotals(
  entries: MealEntry[],
  dates: string[],
  owner: UserName,
): WeekTotals {
  const byDate: Record<string, number> = {};
  for (const date of dates) byDate[date] = 0;

  for (const entry of entries) {
    if (entry.owner === owner && entry.date in byDate) {
      byDate[entry.date] += entry.calories;
    }
  }

  const eaten = Object.values(byDate).filter((value) => value > 0);

  return {
    byDate,
    total: eaten.reduce((sum, value) => sum + value, 0),
    dayCount: eaten.length,
  };
}
