import { describe, expect, it } from 'vitest';
import {
  clampRestRatio,
  computeRestSeconds,
  elapsedMinutesToLog,
} from './flexibleTime';

describe('clampRestRatio', () => {
  it('clamps below 2 up to 2', () => {
    expect(clampRestRatio(1)).toBe(2);
    expect(clampRestRatio(0)).toBe(2);
  });

  it('clamps above 10 down to 10', () => {
    expect(clampRestRatio(11)).toBe(10);
    expect(clampRestRatio(100)).toBe(10);
  });

  it('rounds to nearest integer in range', () => {
    expect(clampRestRatio(5)).toBe(5);
    expect(clampRestRatio(4.6)).toBe(5);
  });

  it('falls back to 5 for non-finite values', () => {
    expect(clampRestRatio(NaN)).toBe(5);
    expect(clampRestRatio(Infinity)).toBe(5);
  });
});

describe('computeRestSeconds', () => {
  it('computes 30 min study at /5 as 360 rest seconds', () => {
    expect(computeRestSeconds(30 * 60, 5)).toBe(360);
  });

  it('floors partial seconds', () => {
    expect(computeRestSeconds(59, 5)).toBe(11);
  });

  it('returns 0 for non-positive elapsed', () => {
    expect(computeRestSeconds(0, 5)).toBe(0);
    expect(computeRestSeconds(-10, 5)).toBe(0);
  });
});

describe('elapsedMinutesToLog', () => {
  it('returns null for sub-minute elapsed', () => {
    expect(elapsedMinutesToLog(0)).toBeNull();
    expect(elapsedMinutesToLog(59)).toBeNull();
  });

  it('returns floor minutes at and above 60 seconds', () => {
    expect(elapsedMinutesToLog(60)).toBe(1);
    expect(elapsedMinutesToLog(119)).toBe(1);
    expect(elapsedMinutesToLog(1800)).toBe(30);
  });
});
