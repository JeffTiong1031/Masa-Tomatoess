import type { HandleMap } from '@/lib/assistantContext';
import type { ChangeParser, Reason } from '@/lib/assistantReply';
import { STEP_BUDGET_MS, type Planned, type StepOutcome } from '@/lib/assistantRun';
import type { Message, ReplyResult } from '@/lib/assistantRequest';
import type { UserName } from '@/lib/identity';

export { STEP_BUDGET_MS };

export interface AssistantClock {
  today: string;
  now: string;
}

export interface AskInput<R> {
  rows: R[];
  map: HandleMap;
  today: string;
  now: string;
  history: Message[];
  owner: UserName;
}

export interface AssistantSection<C extends { handle: string }, R> {
  prefix: string;
  title: string;
  placeholder: string;
  fetchFailure: string;
  ask(input: AskInput<R>): Promise<{ map: HandleMap; result: ReplyResult }>;
  parser(map: HandleMap, today: string): ChangeParser<C>;
  validatePlan(changes: C[]): Reason | null;
  reconcile(changes: C[], map: HandleMap, rows: R[]): Planned<C>[];
  clashTitles(entry: Planned<C>, rows: R[]): string[];
  clashNote(title: string): string;
  outsideNote(change: C): string;
  opWord(change: C): string;
  describe(change: C): string;
  fetchFresh(owner: UserName): Promise<R[] | null>;
  runChange(entry: Planned<C>, owner: UserName): Promise<StepOutcome>;
}

export async function withStepBudget(work: Promise<StepOutcome>): Promise<StepOutcome> {
  let timer!: number;
  const budget = new Promise<StepOutcome>((resolve) => {
    timer = window.setTimeout(() => resolve('unreached'), STEP_BUDGET_MS);
  });

  const outcome = await Promise.race([work, budget]);
  window.clearTimeout(timer);
  return outcome;
}
