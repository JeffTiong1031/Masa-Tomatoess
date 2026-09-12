import { describe, expect, it } from 'vitest';
import {
  HOME_BLOBS,
  HOME_DOTS,
  HOME_FIELD_ACCENTS,
  HOME_RINGS,
  busyDotAccent,
  filledFocusBars,
  filledStreakPips,
} from './homeField';

describe('home field decorations', () => {
  it('keeps enough blobs, dots, and rings to fill the cream', () => {
    expect(HOME_BLOBS.length).toBeGreaterThanOrEqual(8);
    expect(HOME_DOTS.length).toBeGreaterThanOrEqual(18);
    expect(HOME_RINGS.length).toBeGreaterThanOrEqual(8);
  });

  it('only uses shipped section accents', () => {
    const allowed = new Set<string>(HOME_FIELD_ACCENTS);
    for (const piece of [...HOME_BLOBS, ...HOME_DOTS, ...HOME_RINGS]) {
      expect(allowed.has(piece.accent), piece.accent).toBe(true);
    }
  });
});

describe('filledFocusBars', () => {
  it('fills three of four bars at 47 minutes', () => {
    expect(filledFocusBars(47)).toEqual([true, true, true, false]);
  });

  it('stays empty when nothing is logged', () => {
    expect(filledFocusBars(0)).toEqual([false, false, false, false]);
  });
});

describe('filledStreakPips', () => {
  it('fills four of seven pips on a four-day streak', () => {
    expect(filledStreakPips(4)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe('busyDotAccent', () => {
  it('walks the petal trio then wraps', () => {
    expect(busyDotAccent(0)).toBe('cycle');
    expect(busyDotAccent(1)).toBe('countdown');
    expect(busyDotAccent(2)).toBe('timer');
    expect(busyDotAccent(3)).toBe('cycle');
  });
});
