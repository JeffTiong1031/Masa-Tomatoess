import type { Weekday } from './dates';
import { USERS, type UserName } from './identity';
import type { TimelineEntry } from './timeline';

export type Week = Record<Weekday, TimelineEntry[]>;
export type WeekByUser = Record<UserName, Week>;

export interface TimelineRow {
  user_name: UserName;
  weekday: Weekday;
  entries: TimelineEntry[];
}

const WEEKDAY_KEYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function emptyWeek(): Week {
  return Object.fromEntries(WEEKDAY_KEYS.map((day) => [day, []])) as unknown as Week;
}

export function emptyWeeks(): WeekByUser {
  return Object.fromEntries(
    USERS.map((user) => [user, emptyWeek()]),
  ) as WeekByUser;
}

export function weeksFromRows(rows: TimelineRow[]): WeekByUser {
  const weeks = emptyWeeks();
  for (const row of rows) weeks[row.user_name][row.weekday] = row.entries;
  return weeks;
}
