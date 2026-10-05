export type EntryKind = 'expense' | 'income';

export type BudgetPeriodKind = 'week' | 'month';

export interface Category {
  id: string;
  kind: EntryKind;
  name: string;
  system: 'saving' | null;
  archived: boolean;
  swatchId: string | null;
}

interface EntryBase {
  id: string;
  amountSen: number;
  categoryId: string;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface HandEntry extends EntryBase {
  source: 'hand';
  kind: EntryKind;
}

export interface SavingEntry extends EntryBase {
  source: 'saving';
  kind: 'income';
  periodStart: string;
  budgetSen: number;
}

export type Entry = HandEntry | SavingEntry;

export interface Template {
  id: string;
  kind: EntryKind;
  label: string;
  amountSen: number;
  categoryId: string;
}

export interface PendingSwitch {
  period: BudgetPeriodKind;
  from: string;
  amountSen: number;
}

export interface BudgetPlan {
  amountSen: number;
  period: BudgetPeriodKind;
  anchor: string;
  next: PendingSwitch | null;
}

export interface BudgetPeriod {
  start: string;
  end: string;
  amountSen: number;
}

export interface NewSaving {
  amountSen: number;
  date: string;
  periodStart: string;
  budgetSen: number;
}

export interface EntryDraft {
  kind: EntryKind;
  amountSen: number;
  categoryId: string;
  date: string;
  note: string | null;
}
