import { describe, expect, it } from 'vitest';
import { TINT, phaseFill } from './cycleColors';
import { displayPhase, fillFor, isGuessedPeriod, runKey } from './cycleDisplay';
import type { CalendarDay } from './cycleCalendar';

function day(overrides: Partial<CalendarDay>): CalendarDay {
  return {
    date: '2026-08-16',
    phase: 'luteal',
    recorded: false,
    predicted: false,
    inMonth: true,
    isToday: false,
    hasSymptoms: false,
    ...overrides,
  };
}

describe('displayPhase', () => {
  it('clamps every recorded day to menstrual, even past the learned period length', () => {
    expect(displayPhase(day({ phase: 'follicular', recorded: true }))).toBe('menstrual');
    expect(displayPhase(day({ phase: 'fertile', recorded: true }))).toBe('menstrual');
  });

  it('leaves a day she did not record alone', () => {
    expect(displayPhase(day({ phase: 'follicular' }))).toBe('follicular');
  });

  it('passes a null phase through', () => {
    expect(displayPhase(day({ phase: null }))).toBeNull();
  });
});

describe('isGuessedPeriod', () => {
  it('is true for the tail of an open period and for a projected one', () => {
    expect(isGuessedPeriod(day({ phase: 'menstrual' }))).toBe(true);
    expect(isGuessedPeriod(day({ phase: 'menstrual', predicted: true }))).toBe(true);
  });

  it('is false for every recorded day', () => {
    expect(isGuessedPeriod(day({ phase: 'menstrual', recorded: true }))).toBe(false);
  });

  it('is false for a day that is not a period day at all', () => {
    expect(isGuessedPeriod(day({ phase: 'fertile' }))).toBe(false);
  });
});

describe('runKey', () => {
  it('keeps a recorded day and an adjacent guessed day in separate runs', () => {
    const recorded = day({ phase: 'menstrual', recorded: true });
    const guessed = day({ phase: 'menstrual' });
    expect(runKey(recorded)).not.toBe(runKey(guessed));
  });

  it('joins consecutive recorded days whose computed phases differ', () => {
    const inside = day({ phase: 'menstrual', recorded: true });
    const past = day({ phase: 'follicular', recorded: true });
    expect(runKey(past)).toBe(runKey(inside));
  });

  it('separates a day inside the month from one outside it', () => {
    expect(runKey(day({ inMonth: false }))).not.toBe(runKey(day({ inMonth: true })));
  });
});

describe('fillFor', () => {
  it('paints a recorded day at the solid period tint', () => {
    expect(fillFor(day({ phase: 'menstrual', recorded: true }))).toBe(
      phaseFill('menstrual', TINT.period),
    );
  });

  it('paints a guessed period day at the fainter predicted tint', () => {
    expect(fillFor(day({ phase: 'menstrual' }))).toBe(
      phaseFill('menstrual', TINT.predicted),
    );
  });

  it('never gives a guessed day the same fill as a recorded one', () => {
    expect(fillFor(day({ phase: 'menstrual' }))).not.toBe(
      fillFor(day({ phase: 'menstrual', recorded: true })),
    );
  });

  it('recedes an out-of-month day by tint rather than dropping it', () => {
    expect(fillFor(day({ phase: 'luteal', inMonth: false }))).toBe(
      phaseFill('luteal', TINT.outOfMonth),
    );
  });

  it('paints nothing for a date the app knows nothing about', () => {
    expect(fillFor(day({ phase: null }))).toBe('transparent');
  });
});
