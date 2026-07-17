import { describe, expect, it } from 'vitest';
import {
  buildHeatmapRange,
  countToLevel,
  heatmapDaysForWidth,
} from '@/lib/heatmapRange';

describe('countToLevel', () => {
  it('maps counts to github-style levels', () => {
    expect(countToLevel(0)).toBe(0);
    expect(countToLevel(1)).toBe(1);
    expect(countToLevel(3)).toBe(2);
    expect(countToLevel(5)).toBe(3);
    expect(countToLevel(8)).toBe(4);
  });
});

describe('heatmapDaysForWidth', () => {
  it('returns compact ranges for smaller screens', () => {
    expect(heatmapDaysForWidth(390)).toBe(84);
    expect(heatmapDaysForWidth(800)).toBe(182);
    expect(heatmapDaysForWidth(1280)).toBe(366);
  });
});

describe('buildHeatmapRange', () => {
  it('builds contiguous days including today', () => {
    const today = new Date('2026-07-17T12:00:00.000Z');
    const map = new Map<string, number>([['2026-07-17', 3], ['2026-07-15', 1]]);
    const days = buildHeatmapRange(map, 7, today);
    expect(days).toHaveLength(7);
    expect(days[days.length - 1].date).toBe('2026-07-17');
    expect(days[days.length - 1].level).toBe(2);
    expect(days[days.length - 3].count).toBe(1);
    expect(days[0].count).toBe(0);
  });
});
