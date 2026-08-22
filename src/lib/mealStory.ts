import { DAY_BOUNDARY_HOUR } from '@/lib/mealDay';
import type { MealEntry, MealSlot } from '@/lib/meals';

const MINUTES_PER_DAY = 1440;

const NOMINAL_TIME: Record<MealSlot, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
  snack: '22:00',
};

function minutesSinceBoundary(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  const offset = hour * 60 + minute - DAY_BOUNDARY_HOUR * 60;
  return (offset + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function sortKey(entry: MealEntry): number {
  return minutesSinceBoundary(entry.atTime ?? NOMINAL_TIME[entry.slot]);
}

export function storyOrder(entries: MealEntry[]): MealEntry[] {
  return [...entries].sort((a, b) => sortKey(a) - sortKey(b));
}
