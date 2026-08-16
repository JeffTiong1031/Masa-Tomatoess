export interface TimetableEntry {
  time: string;
  activity: string;
}

export function normalizeEntries(entries: TimetableEntry[]): TimetableEntry[] {
  return entries
    .map((entry) => ({
      time: entry.time.trim(),
      activity: entry.activity.trim(),
    }))
    .filter((entry) => entry.activity.length > 0);
}
