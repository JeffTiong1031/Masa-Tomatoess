import { addDays, addMonths, diffDays, formatLongDate, monthOf } from './dates';
import type {
  BudgetPeriod,
  BudgetPeriodKind,
  BudgetPlan,
  Entry,
  NewSaving,
  SavingEntry,
} from './finance';
import { formatRM } from './financeMoney';

export type BudgetTone = 'calm' | 'warning' | 'over';

export interface BudgetBar {
  period: BudgetPeriod;
  spentSen: number;
  leftSen: number;
  daysLeft: number;
  perDaySen: number;
  tone: BudgetTone;
  switchNote: string | null;
}

export interface BudgetEdit {
  amountSen: number;
  period: BudgetPeriodKind;
}

export interface SavingUpdate {
  id: string;
  amountSen: number;
}

interface Span {
  start: string;
  end: string;
}

const PERIOD_NAME: Record<BudgetPeriodKind, string> = {
  week: 'Weekly',
  month: 'Monthly',
};

function lastDayOf(month: string): number {
  return Number(addDays(`${addMonths(month, 1)}-01`, -1).slice(8));
}

function monthlyStart(anchor: string, offset: number): string {
  const month = addMonths(monthOf(anchor), offset);
  const day = Math.min(Number(anchor.slice(8)), lastDayOf(month));
  return `${month}-${`${day}`.padStart(2, '0')}`;
}

function monthsBetween(later: string, earlier: string): number {
  const [ly, lm] = later.split('-').map(Number);
  const [ey, em] = earlier.split('-').map(Number);
  return (ly - ey) * 12 + (lm - em);
}

export function periodAt(
  kind: BudgetPeriodKind,
  anchor: string,
  date: string,
): Span {
  if (kind === 'week') {
    const start = addDays(anchor, Math.floor(diffDays(date, anchor) / 7) * 7);
    return { start, end: addDays(start, 6) };
  }
  const guess = monthsBetween(date, anchor);
  const offset = monthlyStart(anchor, guess) > date ? guess - 1 : guess;
  return {
    start: monthlyStart(anchor, offset),
    end: addDays(monthlyStart(anchor, offset + 1), -1),
  };
}

export function periodContaining(plan: BudgetPlan, date: string): BudgetPeriod {
  if (plan.next !== null && date >= plan.next.from) {
    return {
      ...periodAt(plan.next.period, plan.next.from, date),
      amountSen: plan.next.amountSen,
    };
  }
  return { ...periodAt(plan.period, plan.anchor, date), amountSen: plan.amountSen };
}

function spentIn(entries: Entry[], start: string, end: string): number {
  return entries
    .filter((entry) => entry.kind === 'expense' && entry.date >= start && entry.date <= end)
    .reduce((sum, entry) => sum + entry.amountSen, 0);
}

function toneFor(amountSen: number, spentSen: number): BudgetTone {
  if (spentSen > amountSen) return 'over';
  return (amountSen - spentSen) * 4 <= amountSen ? 'warning' : 'calm';
}

export function budgetBar(plan: BudgetPlan, entries: Entry[], today: string): BudgetBar {
  const period = periodContaining(plan, today);
  const spentSen = spentIn(entries, period.start, period.end);
  const leftSen = period.amountSen - spentSen;
  const daysLeft = diffDays(period.end, today) + 1;
  const pending = plan.next !== null && today < plan.next.from ? plan.next : null;
  return {
    period,
    spentSen,
    leftSen,
    daysLeft,
    perDaySen: leftSen > 0 ? Math.floor(leftSen / daysLeft) : 0,
    tone: toneFor(period.amountSen, spentSen),
    switchNote:
      pending === null
        ? null
        : `${PERIOD_NAME[pending.period]} budget starts ${formatLongDate(pending.from)}`,
  };
}

function daysLeftText(daysLeft: number): string {
  return daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
}

export function budgetLines(bar: BudgetBar): { headline: string; detail: string | null } {
  if (bar.leftSen < 0) return { headline: `${formatRM(-bar.leftSen)} over`, detail: null };
  return {
    headline: `${formatRM(bar.leftSen)} left`,
    detail: `${daysLeftText(bar.daysLeft)} · ~${formatRM(bar.perDaySen)}/day`,
  };
}

export interface TankStat {
  label: string;
  value: string;
}

export interface BudgetTank {
  level: number;
  amount: string;
  caption: string;
  stats: TankStat[];
}

export function budgetTank(bar: BudgetBar): BudgetTank {
  const budget = formatRM(bar.period.amountSen);
  const over = bar.leftSen < 0;
  return {
    level: Math.min(Math.abs(bar.leftSen) / bar.period.amountSen, 1),
    amount: formatRM(Math.abs(bar.leftSen)),
    caption: over ? `over the ${budget} budget` : `left of ${budget}`,
    stats: [
      { label: 'Spent', value: formatRM(bar.spentSen) },
      { label: 'Time', value: daysLeftText(bar.daysLeft) },
      {
        label: 'Daily limit',
        value: bar.perDaySen > 0 ? `~${formatRM(bar.perDaySen)}` : formatRM(0),
      },
    ],
  };
}

export function budgetText(bar: BudgetBar): string {
  const { headline, detail } = budgetLines(bar);
  return detail === null ? headline : `${headline} · ${detail}`;
}

export function foldPlan(plan: BudgetPlan, today: string): BudgetPlan {
  if (plan.next === null || today < plan.next.from) return plan;
  return {
    amountSen: plan.next.amountSen,
    period: plan.next.period,
    anchor: plan.next.from,
    next: null,
  };
}

export function applyBudgetEdit(
  plan: BudgetPlan | null,
  edit: BudgetEdit,
  today: string,
): BudgetPlan {
  if (plan === null) {
    return { amountSen: edit.amountSen, period: edit.period, anchor: today, next: null };
  }
  const current = foldPlan(plan, today);
  if (edit.period === current.period) {
    return { ...current, amountSen: edit.amountSen, next: null };
  }
  const running = periodContaining(current, today);
  return {
    ...current,
    next: { period: edit.period, from: addDays(running.end, 1), amountSen: edit.amountSen },
  };
}

export function closedPeriods(plan: BudgetPlan, today: string): BudgetPeriod[] {
  const periods: BudgetPeriod[] = [];
  let period = periodContaining(plan, plan.anchor);
  while (period.end < today) {
    periods.push(period);
    period = periodContaining(plan, addDays(period.end, 1));
  }
  return periods;
}

function savingsOf(entries: Entry[]): SavingEntry[] {
  return entries.filter((entry): entry is SavingEntry => entry.source === 'saving');
}

export function missingSavings(
  plan: BudgetPlan,
  entries: Entry[],
  today: string,
): NewSaving[] {
  const settled = new Set(savingsOf(entries).map((entry) => entry.periodStart));
  return closedPeriods(plan, today)
    .filter((period) => !settled.has(period.start))
    .map((period) => ({
      amountSen: period.amountSen - spentIn(entries, period.start, period.end),
      date: period.end,
      periodStart: period.start,
      budgetSen: period.amountSen,
    }));
}

function recalc(entries: Entry[], savings: SavingEntry[]): SavingUpdate[] {
  return savings
    .map((entry) => ({
      id: entry.id,
      was: entry.amountSen,
      amountSen: entry.budgetSen - spentIn(entries, entry.periodStart, entry.date),
    }))
    .filter((update) => update.amountSen !== update.was)
    .map(({ id, amountSen }) => ({ id, amountSen }));
}

export function savingRecalcs(entries: Entry[], touchedDates: string[]): SavingUpdate[] {
  const touched = savingsOf(entries).filter((entry) =>
    touchedDates.some((date) => date >= entry.periodStart && date <= entry.date),
  );
  return recalc(entries, touched);
}

export function allSavingRecalcs(entries: Entry[]): SavingUpdate[] {
  return recalc(entries, savingsOf(entries));
}

export function withSavingUpdates(entries: Entry[], updates: SavingUpdate[]): Entry[] {
  const amounts = new Map(updates.map((update) => [update.id, update.amountSen]));
  return entries.map((entry) =>
    amounts.has(entry.id) ? { ...entry, amountSen: amounts.get(entry.id)! } : entry,
  );
}
