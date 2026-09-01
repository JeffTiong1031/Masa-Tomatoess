import { describe, it, expect } from 'vitest';
import {
  nextStep,
  buttonStateFor,
  APPLY_BUDGET_MS,
  UNREACHED_LIMIT,
  type ChangeOutcome,
  type RunState,
  type StepOutcome,
} from './assistantRun';

describe('nextStep', () => {
  it('keeps going at the start', () => {
    expect(nextStep({ outcomes: [], elapsedMs: 0 })).toBe('run');
  });

  it('keeps going after a database error', () => {
    const outcomes: StepOutcome[] = ['failed', 'failed', 'failed'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });

  it('stops after three unreached calls in a row', () => {
    const outcomes: StepOutcome[] = Array(UNREACHED_LIMIT).fill('unreached');
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('stopNetwork');
  });

  it('keeps going when a database error breaks the unreached run', () => {
    const outcomes: StepOutcome[] = ['unreached', 'unreached', 'failed'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });

  it('keeps going when a save breaks the unreached run', () => {
    const outcomes: StepOutcome[] = ['unreached', 'unreached', 'saved'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });

  it('stops when the budget is spent', () => {
    expect(nextStep({ outcomes: ['saved'], elapsedMs: APPLY_BUDGET_MS })).toBe('stopBudget');
  });

  it('prefers the budget when both would stop it', () => {
    const outcomes: StepOutcome[] = Array(UNREACHED_LIMIT).fill('unreached');
    expect(nextStep({ outcomes, elapsedMs: APPLY_BUDGET_MS + 1 })).toBe('stopBudget');
  });

  it('keeps going when three unreached calls are not consecutive', () => {
    const outcomes: StepOutcome[] = ['unreached', 'failed', 'unreached', 'unreached'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });
});

describe('buttonStateFor', () => {
  it('is saving only while the run is going', () => {
    expect(buttonStateFor(['pending'], true)).toBe('saving');
  });

  it('never leaves a finished run on saving', () => {
    const every: ChangeOutcome[] = ['pending', 'saved', 'stale', 'failed', 'notAttempted'];
    for (const outcome of every) {
      const state: RunState = buttonStateFor([outcome], false);
      expect(state).not.toBe('saving');
    }
  });

  it('offers a retry when something failed', () => {
    expect(buttonStateFor(['saved', 'failed'], false)).toBe('retry');
  });

  it('offers a retry when something was not attempted', () => {
    expect(buttonStateFor(['saved', 'notAttempted'], false)).toBe('retry');
  });

  it('does not offer a retry for a stale row alone', () => {
    expect(buttonStateFor(['saved', 'stale'], false)).toBe('done');
  });

  it('is idle before anything has run', () => {
    expect(buttonStateFor(['pending'], false)).toBe('idle');
  });
});
