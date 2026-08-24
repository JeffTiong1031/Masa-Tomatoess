import { todayISO } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import type { MealEntry, MealSlot } from '@/lib/meals';

const MS_PER_HOUR = 3_600_000;

export const DAY_BOUNDARY_HOUR = 4;

const REQUIRED_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export function mealDate(at: Date): string {
  return todayISO(new Date(at.getTime() - DAY_BOUNDARY_HOUR * MS_PER_HOUR));
}

export function foodToday(now: Date = new Date()): string {
  return mealDate(now);
}

export function slotForTime(at: Date): MealSlot {
  const hour = at.getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

export function missingSlots(entries: MealEntry[]): MealSlot[] {
  const present = new Set(entries.map((entry) => entry.slot));
  return REQUIRED_SLOTS.filter((slot) => !present.has(slot));
}

export function isComplete(entries: MealEntry[]): boolean {
  return missingSlots(entries).length === 0;
}

export function dayTotal(entries: MealEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.calories, 0);
}

export function intakeFor(
  entries: MealEntry[],
  date: string,
  owner: UserName,
): number {
  return dayTotal(
    entries.filter((entry) => entry.date === date && entry.owner === owner),
  );
}
