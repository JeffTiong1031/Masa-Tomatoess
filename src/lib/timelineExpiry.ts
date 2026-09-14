import { addDays, weekdayIndex, type Weekday } from './dates';
import type { UserName } from './identity';
import type { TimelineRow } from './timelineWeek';

export type StaleTimelineKey = {
  user_name: UserName;
  weekday: Weekday;
};

export function staleTimelineKeys(
  rows: TimelineRow[],
  today: string,
): StaleTimelineKey[] {
  const yesterday = weekdayIndex(addDays(today, -1)) as Weekday;
  const stale: StaleTimelineKey[] = [];
  for (const row of rows) {
    if (row.entries.length === 0) continue;
    if (row.weekday !== yesterday) continue;
    stale.push({ user_name: row.user_name, weekday: row.weekday });
  }
  return stale;
}
