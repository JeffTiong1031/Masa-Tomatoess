import { describe, expect, it } from 'vitest';
import { clampDurationMinutes, MAX_FOCUS_DURATION_MINUTES } from './sessionDuration';

describe('clampDurationMinutes', () => {
  it('preserves a 200-minute flexible session for Supabase sync', () => {
    expect(clampDurationMinutes(200)).toBe(200);
  });

  it('clamps below 1 up to 1', () => {
    expect(clampDurationMinutes(0)).toBe(1);
    expect(clampDurationMinutes(-5)).toBe(1);
  });

  it('clamps above the max down to the max', () => {
    expect(clampDurationMinutes(MAX_FOCUS_DURATION_MINUTES + 1)).toBe(
      MAX_FOCUS_DURATION_MINUTES
    );
  });

  it('falls back to 1 for non-finite values', () => {
    expect(clampDurationMinutes(NaN)).toBe(1);
    expect(clampDurationMinutes(Infinity)).toBe(1);
  });
});
