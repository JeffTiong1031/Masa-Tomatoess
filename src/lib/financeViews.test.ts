import { describe, expect, it } from 'vitest';
import type { Category, Entry, Template } from './finance';
import {
  categoriesByUse,
  dailyGroups,
  entryLines,
  liveTemplates,
  monthSummary,
} from './financeViews';

const categories: Category[] = [
  { id: 'food', kind: 'expense', name: 'Food', system: null, archived: false },
  { id: 'bills', kind: 'expense', name: 'Bills', system: null, archived: false },
  { id: 'fun', kind: 'expense', name: 'Fun', system: null, archived: true },
  { id: 'travel', kind: 'expense', name: 'Travel', system: null, archived: false },
  { id: 'pay', kind: 'income', name: 'Pay', system: null, archived: false },
  { id: 'saving', kind: 'income', name: 'Saving', system: 'saving', archived: false },
];

function entry(
  id: string,
  categoryId: string,
  date: string,
  amountSen: number,
  createdAt = `${date}T10:00:00Z`,
): Entry {
  const kind = categories.find((c) => c.id === categoryId)!.kind;
  return { id, source: 'hand', kind, amountSen, categoryId, date, note: null, createdAt };
}

const october: Entry[] = [
  entry('a', 'food', '2026-10-02', 8500, '2026-10-02T08:00:00Z'),
  entry('b', 'food', '2026-10-02', 1200, '2026-10-02T13:00:00Z'),
  entry('c', 'bills', '2026-10-05', 18000),
  entry('d', 'fun', '2026-10-07', 2300),
  entry('e', 'pay', '2026-10-07', 300000),
  {
    id: 's',
    source: 'saving',
    kind: 'income',
    amountSen: -4050,
    categoryId: 'saving',
    date: '2026-10-08',
    note: null,
    createdAt: '2026-10-09T00:00:00Z',
    periodStart: '2026-10-02',
    budgetSen: 60000,
  },
  entry('x', 'food', '2026-09-30', 999),
];

describe('the daily list', () => {
  it('groups the month by day, newest day and newest entry first, with totals', () => {
    const groups = dailyGroups(october, '2026-10', '2026-10-08');
    expect(groups.map((g) => [g.date, g.label, g.spentSen, g.incomeSen])).toEqual([
      ['2026-10-08', 'Today', 0, -4050],
      ['2026-10-07', 'Yesterday', 2300, 300000],
      ['2026-10-05', 'Mon 5 Oct', 18000, 0],
      ['2026-10-02', 'Fri 2 Oct', 9700, 0],
    ]);
    expect(groups[3].entries.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('is empty for a month with nothing logged', () => {
    expect(dailyGroups(october, '2026-11', '2026-11-01')).toEqual([]);
  });
});

describe('the month summary', () => {
  it('adds spending up by category, largest first, with shares and totals', () => {
    expect(monthSummary(october, categories, '2026-10')).toEqual({
      rows: [
        { categoryId: 'bills', name: 'Bills', spentSen: 18000, percent: 60 },
        { categoryId: 'food', name: 'Food', spentSen: 9700, percent: 32 },
        { categoryId: 'fun', name: 'Fun', spentSen: 2300, percent: 8 },
      ],
      totalSpentSen: 30000,
      totalIncomeSen: 300000 - 4050,
    });
  });

  it('shows nothing for an empty month', () => {
    expect(monthSummary(october, categories, '2026-12')).toEqual({
      rows: [],
      totalSpentSen: 0,
      totalIncomeSen: 0,
    });
  });
});

describe('category chips', () => {
  it('puts the most-used first, ties by name, and hides archived categories', () => {
    const used = [...october, entry('f', 'travel', '2026-10-03', 100)];
    expect(categoriesByUse(categories, used, 'expense').map((c) => c.id)).toEqual([
      'food',
      'bills',
      'travel',
    ]);
  });

  it('never offers Saving for income added by hand', () => {
    expect(categoriesByUse(categories, october, 'income').map((c) => c.id)).toEqual(['pay']);
  });
});

describe('quick templates', () => {
  it('hides templates whose category is archived', () => {
    const templates: Template[] = [
      { id: 't1', kind: 'expense', label: 'Lunch', amountSen: 1200, categoryId: 'food' },
      { id: 't2', kind: 'expense', label: 'Cinema', amountSen: 2300, categoryId: 'fun' },
    ];
    expect(liveTemplates(templates, categories).map((t) => t.id)).toEqual(['t1']);
  });
});

describe('an entry row', () => {
  const food = entry('n', 'food', '2026-10-03', 5500);
  const pay = entry('p', 'pay', '2026-10-03', 300000);

  it('leads with the note and puts the category underneath', () => {
    expect(entryLines({ ...food, note: 'Lunch' }, 'Food')).toEqual({
      title: 'Lunch',
      subtitle: 'Food',
    });
  });

  it('shows the category alone when there is no note', () => {
    expect(entryLines(food, 'Food')).toEqual({ title: 'Food', subtitle: null });
  });

  it('marks income under the note, beside the category', () => {
    expect(entryLines({ ...pay, note: 'October pay' }, 'Pay')).toEqual({
      title: 'October pay',
      subtitle: 'Income · Pay',
    });
    expect(entryLines(pay, 'Pay')).toEqual({ title: 'Pay', subtitle: 'Income' });
  });

  it('labels a budget saving with its period', () => {
    const saving = october.find((e) => e.source === 'saving')!;
    expect(entryLines(saving, 'Saving')).toEqual({
      title: 'Saving',
      subtitle: 'Budget 2 Oct – 8 Oct',
    });
  });
});
