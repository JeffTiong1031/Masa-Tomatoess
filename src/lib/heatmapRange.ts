export type HeatmapDay = {
  date: string;
  count: number;
  level: number;
};

export function countToLevel(count: number): number {
  if (count >= 8) return 4;
  if (count >= 5) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

/** Build heatmap series for the last N days inclusive of today. */
export function buildHeatmapRange(
  countsByDate: Map<string, number> | Record<string, number>,
  days: number,
  today: Date = new Date()
): HeatmapDay[] {
  const map =
    countsByDate instanceof Map
      ? countsByDate
      : new Map(Object.entries(countsByDate));

  const result: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = map.get(dateStr) || 0;
    result.push({ date: dateStr, count, level: countToLevel(count) });
  }
  return result;
}

/** Phone: ~12 weeks; tablet: ~26 weeks; desktop: full year. */
export function heatmapDaysForWidth(width: number): number {
  if (width < 640) return 84;
  if (width < 1024) return 182;
  return 366;
}
