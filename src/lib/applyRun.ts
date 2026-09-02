import { clashesFor, reconcileTodoPlan, type PlannedChange } from './todoPlan';
import { nextStep, type StepOutcome } from './assistantRun';
import type { HandleMap } from './assistantContext';
import type { Todo } from './todo';

export type ChangeRunner = (entry: PlannedChange) => Promise<StepOutcome>;

export type ApplyTone = 'ok' | 'problem';

export function applySummary(results: PlannedChange[]): { message: string; tone: ApplyTone } {
  const saved = results.filter((entry) => entry.outcome === 'saved').length;
  if (saved === results.length) {
    return { message: `Saved ${saved} change${saved === 1 ? '' : 's'}.`, tone: 'ok' };
  }
  if (saved === 0) return { message: 'Nothing saved.', tone: 'problem' };
  return { message: `${saved} of ${results.length} saved.`, tone: 'problem' };
}

export async function runPlan(
  planned: PlannedChange[],
  map: HandleMap,
  live: Todo[],
  run: ChangeRunner,
  now: () => number,
): Promise<PlannedChange[]> {
  const startedAt = now();
  const outcomes: StepOutcome[] = [];
  const results: PlannedChange[] = [];

  for (const previous of planned) {
    if (previous.outcome === 'saved' || previous.outcome === 'stale' || previous.outcome === 'uncertain') {
      results.push(previous);
      continue;
    }

    const [step] = reconcileTodoPlan([previous.change], map, live);
    if (step.outcome === 'stale') {
      results.push(step);
      continue;
    }

    const action = nextStep({ outcomes, elapsedMs: now() - startedAt });
    if (action !== 'run') {
      results.push({ ...step, outcome: 'notAttempted', note: 'Not tried — the run stopped.' });
      continue;
    }

    const outcome = await run(step);
    outcomes.push(outcome);

    if (outcome === 'saved') {
      const clashes = clashesFor(step.change, live, step.id);
      results.push({
        ...step,
        outcome: 'saved',
        note: clashes.length > 0 ? `That day already had "${clashes[0].title}".` : '',
      });
      continue;
    }

    results.push({
      ...step,
      outcome: outcome === 'unreached' ? 'uncertain' : 'failed',
      note:
        outcome === 'unreached'
          ? 'Took too long. It may have saved — check your list before trying again.'
          : 'The database refused it.',
    });
  }

  return results;
}
