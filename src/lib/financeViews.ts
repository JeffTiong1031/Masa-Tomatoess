import { addDays, formatLongDate, formatShortDate, monthOf } from './dates';
import type { Category, Entry, EntryKind, Template } from './finance';

export interface DayGroup {
  date: string;
  label: string;
  spentSen: number;
  incomeSen: number;
  entries: Entry[];
}

export interface SummaryRow {
  categoryId: string;
  name: string;
  spentSen: number;
  percent: number;
}

export interface EntryLines {
  title: string;
  subtitle: string | null;
}

export interface MonthSummary {
  rows: SummaryRow[];
  totalSpentSen: number;
  totalIncomeSen: number;
}

function sumOf(entries: Entry[], kind: EntryKind): number {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((sum, entry) => sum + entry.amountSen, 0);
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatLongDate(date);
}

function inMonth(entries: Entry[], month: string): Entry[] {
  return entries.filter((entry) => monthOf(entry.date) === month);
}

export function dailyGroups(entries: Entry[], month: string, today: string): DayGroup[] {
  const byDate = new Map<string, Entry[]>();
  for (const entry of inMonth(entries, month)) {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, day]) => ({
      date,
      label: dayLabel(date, today),
      spentSen: sumOf(day, 'expense'),
      incomeSen: sumOf(day, 'income'),
      entries: [...day].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
}

export function monthSummary(
  entries: Entry[],
  categories: Category[],
  month: string,
): MonthSummary {
  const monthEntries = inMonth(entries, month);
  const totalSpentSen = sumOf(monthEntries, 'expense');
  const byCategory = new Map<string, number>();
  for (const entry of monthEntries.filter((e) => e.kind === 'expense')) {
    byCategory.set(entry.categoryId, (byCategory.get(entry.categoryId) ?? 0) + entry.amountSen);
  }
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const rows = [...byCategory.entries()]
    .map(([categoryId, spentSen]) => ({
      categoryId,
      name: names.get(categoryId)!,
      spentSen,
      percent: Math.round((spentSen * 100) / totalSpentSen),
    }))
    .sort((a, b) => b.spentSen - a.spentSen || a.name.localeCompare(b.name));
  return { rows, totalSpentSen, totalIncomeSen: sumOf(monthEntries, 'income') };
}

export function categoriesByUse(
  categories: Category[],
  entries: Entry[],
  kind: EntryKind,
): Category[] {
  const uses = new Map<string, number>();
  for (const entry of entries) {
    uses.set(entry.categoryId, (uses.get(entry.categoryId) ?? 0) + 1);
  }
  return categories
    .filter((c) => c.kind === kind && !c.archived && c.system === null)
    .sort(
      (a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name),
    );
}

export function liveTemplates(templates: Template[], categories: Category[]): Template[] {
  const live = new Set(categories.filter((c) => !c.archived).map((c) => c.id));
  return templates.filter((template) => live.has(template.categoryId));
}

export function entryLines(entry: Entry, categoryName: string): EntryLines {
  if (entry.source === 'saving') {
    return {
      title: categoryName,
      subtitle: `Budget ${formatShortDate(entry.periodStart)} – ${formatShortDate(entry.date)}`,
    };
  }
  const income = entry.kind === 'income' ? 'Income' : null;
  if (entry.note === null) return { title: categoryName, subtitle: income };
  return {
    title: entry.note,
    subtitle: income === null ? categoryName : `${income} · ${categoryName}`,
  };
}
