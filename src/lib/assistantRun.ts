export const APPLY_BUDGET_MS = 30_000;
export const UNREACHED_LIMIT = 3;

export type ChangeOutcome = 'pending' | 'saved' | 'stale' | 'failed' | 'notAttempted' | 'uncertain';

export const RETRYABLE_OUTCOMES: ChangeOutcome[] = ['failed', 'notAttempted'];

export function isRetryable(outcome: ChangeOutcome): boolean {
  return RETRYABLE_OUTCOMES.includes(outcome);
}
export type StepOutcome = 'saved' | 'failed' | 'unreached';
export type RunAction = 'run' | 'stopNetwork' | 'stopBudget';
export type RunState = 'idle' | 'saving' | 'retry' | 'done';

export function nextStep(state: { outcomes: StepOutcome[]; elapsedMs: number }): RunAction {
  if (state.elapsedMs >= APPLY_BUDGET_MS) return 'stopBudget';

  const tail = state.outcomes.slice(-UNREACHED_LIMIT);
  if (tail.length === UNREACHED_LIMIT && tail.every((outcome) => outcome === 'unreached')) {
    return 'stopNetwork';
  }

  return 'run';
}

export function buttonStateFor(outcomes: ChangeOutcome[], running: boolean): RunState {
  if (running) return 'saving';
  if (outcomes.some(isRetryable)) return 'retry';
  if (outcomes.some((outcome) => outcome === 'pending')) return 'idle';
  return 'done';
}
