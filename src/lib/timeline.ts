export interface TimelineEntry {
  time: string;
  activity: string;
}

export function normalizeEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return entries
    .map((entry) => ({
      time: entry.time.trim(),
      activity: entry.activity.trim(),
    }))
    .filter((entry) => entry.activity.length > 0);
}
