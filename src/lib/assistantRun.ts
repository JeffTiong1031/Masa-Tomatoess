export const APPLY_BUDGET_MS = 30_000;
export const UNREACHED_LIMIT = 3;

export type ChangeOutcome = 'pending' | 'saved' | 'stale' | 'failed' | 'notAttempted';
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
  if (outcomes.some((outcome) => outcome === 'failed' || outcome === 'notAttempted')) {
    return 'retry';
  }
  if (outcomes.every((outcome) => outcome === 'pending')) return 'idle';
  return 'done';
}
