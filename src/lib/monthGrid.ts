import { occursOn, type CalendarEvent } from './calendarEvent';
import { monthGridDates, monthOf } from './dates';
import type { Todo } from './todo';

export interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  hasItems: boolean;
}

export function busyDates(
  events: CalendarEvent[],
  todos: Todo[],
  dates: string[],
): Set<string> {
  const busy = new Set<string>();

  for (const date of dates) {
    if (events.some((event) => occursOn(event, date))) busy.add(date);
  }

  for (const item of todos) {
    if (item.done || item.dueDate === null) continue;
    if (dates.includes(item.dueDate)) busy.add(item.dueDate);
  }

  return busy;
}

export function buildMonthGrid(today: string, busy: Set<string>): MonthCell[] {
  const month = monthOf(today);

  return monthGridDates(month).map((date) => ({
    date,
    day: Number(date.slice(8)),
    inMonth: monthOf(date) === month,
    isToday: date === today,
    hasItems: busy.has(date),
  }));
}
