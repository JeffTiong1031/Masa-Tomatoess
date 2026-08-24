import { addDays, monthGridDates } from '@/lib/dates';
import { weekDates, weekStart } from '@/lib/mealWeek';

export function mealFetchRange(month: string, today: string): [string, string] {
  const grid = monthGridDates(month);
  const week = weekDates(weekStart(today));
  const edges = [
    grid[0],
    grid[grid.length - 1],
    addDays(today, -1),
    week[0],
    week[week.length - 1],
  ];

  return [
    edges.reduce((a, b) => (b < a ? b : a)),
    edges.reduce((a, b) => (b > a ? b : a)),
  ];
}
