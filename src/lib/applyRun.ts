import { nextStep, type Planned, type StepOutcome } from './assistantRun';

export type ChangeRunner<C> = (entry: Planned<C>) => Promise<StepOutcome>;

export type ApplyTone = 'ok' | 'problem';

export function applySummary<C>(results: Planned<C>[]): { message: string; tone: ApplyTone } {
  const saved = results.filter((entry) => entry.outcome === 'saved').length;
  if (saved === results.length) {
    return { message: `Saved ${saved} change${saved === 1 ? '' : 's'}.`, tone: 'ok' };
  }
  if (saved === 0) return { message: 'Nothing saved.', tone: 'problem' };
  return { message: `${saved} of ${results.length} saved.`, tone: 'problem' };
}

export async function runPlan<C>(
  planned: Planned<C>[],
  reconcileOne: (change: C) => Planned<C>,
  clashTitles: (entry: Planned<C>) => string[],
  run: ChangeRunner<C>,
  now: () => number,
): Promise<Planned<C>[]> {
  const startedAt = now();
  const outcomes: StepOutcome[] = [];
  const results: Planned<C>[] = [];

  for (const previous of planned) {
    if (
      previous.outcome === 'saved' ||
      previous.outcome === 'stale' ||
      previous.outcome === 'uncertain'
    ) {
      results.push(previous);
      continue;
    }

    const step = reconcileOne(previous.change);
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
      const titles = clashTitles(step);
      results.push({
        ...step,
        outcome: 'saved',
        note: titles.length > 0 ? `That day already had "${titles[0]}".` : '',
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
