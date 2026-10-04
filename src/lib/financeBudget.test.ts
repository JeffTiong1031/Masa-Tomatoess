import { describe, expect, it } from 'vitest';
import { addDays, malaysiaDate } from './dates';
import type { BudgetPlan, Entry, HandEntry, SavingEntry } from './finance';
import {
  applyBudgetEdit,
  budgetBar,
  budgetLines,
  budgetTank,
  budgetText,
  closedPeriods,
  foldPlan,
  missingSavings,
  periodAt,
  savingRecalcs,
  allSavingRecalcs,
  withSavingUpdates,
} from './financeBudget';

let counter = 0;

function expense(date: string, amountSen: number): HandEntry {
  counter += 1;
  return {
    id: `e${counter}`,
    source: 'hand',
    kind: 'expense',
    amountSen,
    categoryId: 'food',
    date,
    note: null,
    createdAt: `${date}T12:00:00Z`,
  };
}

function income(date: string, amountSen: number): HandEntry {
  return { ...expense(date, amountSen), kind: 'income', categoryId: 'pay' };
}

function saving(
  periodStart: string,
  date: string,
  budgetSen: number,
  amountSen: number,
): SavingEntry {
  counter += 1;
  return {
    id: `s${counter}`,
    source: 'saving',
    kind: 'income',
    amountSen,
    categoryId: 'saving',
    date,
    note: null,
    createdAt: `${date}T23:59:00Z`,
    periodStart,
    budgetSen,
  };
}

const weekly500: BudgetPlan = {
  amountSen: 50000,
  period: 'week',
  anchor: '2026-10-02',
  next: null,
};

const weekly600: BudgetPlan = { ...weekly500, amountSen: 60000 };

const firstWeek: Entry[] = [
  expense('2026-10-02', 8500),
  expense('2026-10-03', 12000),
  expense('2026-10-04', 4550),
  expense('2026-10-05', 18000),
  expense('2026-10-07', 21000),
];

describe('budget periods', () => {
  it('runs weekly periods in seven-day blocks from a Friday anchor', () => {
    expect(periodAt('week', '2026-10-02', '2026-10-02')).toEqual({
      start: '2026-10-02',
      end: '2026-10-08',
    });
    expect(periodAt('week', '2026-10-02', '2026-10-08')).toEqual({
      start: '2026-10-02',
      end: '2026-10-08',
    });
    expect(periodAt('week', '2026-10-02', '2026-10-09')).toEqual({
      start: '2026-10-09',
      end: '2026-10-15',
    });
  });

  it('runs monthly periods from the anchor day', () => {
    expect(periodAt('month', '2026-10-15', '2026-11-14')).toEqual({
      start: '2026-10-15',
      end: '2026-11-14',
    });
    expect(periodAt('month', '2026-10-15', '2026-11-15')).toEqual({
      start: '2026-11-15',
      end: '2026-12-14',
    });
    expect(periodAt('month', '2026-10-15', '2027-01-20')).toEqual({
      start: '2027-01-15',
      end: '2027-02-14',
    });
  });

  it('clamps short months to their last day without dragging later months down', () => {
    const starts = ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'];
    const ends = ['2027-02-27', '2027-03-30', '2027-04-29', '2027-05-30'];
    starts.forEach((start, i) => {
      expect(periodAt('month', '2027-01-31', start)).toEqual({
        start,
        end: ends[i],
      });
      expect(periodAt('month', '2027-01-31', ends[i])).toEqual({
        start,
        end: ends[i],
      });
    });
  });

  it('follows a leap-day anchor into the next years', () => {
    expect(periodAt('month', '2028-02-29', '2028-03-29')).toEqual({
      start: '2028-03-29',
      end: '2028-04-28',
    });
    expect(periodAt('month', '2028-02-29', '2029-02-28')).toEqual({
      start: '2029-02-28',
      end: '2029-03-28',
    });
  });

  it('always starts the next period the day after the last one ends', () => {
    const plan: BudgetPlan = {
      amountSen: 1000,
      period: 'month',
      anchor: '2027-01-31',
      next: null,
    };
    const periods = closedPeriods(plan, '2028-06-01');
    for (let i = 1; i < periods.length; i += 1) {
      expect(periods[i].start).toBe(addDays(periods[i - 1].end, 1));
    }
    expect(periods).toHaveLength(16);
  });
});

describe('the budget bar', () => {
  const table: Array<[string, Entry[], BudgetPlan, string, string]> = [
    ['2026-10-02', firstWeek.slice(0, 1), weekly500, 'RM 415.00 left · 7 days left · ~RM 59.28/day', 'calm'],
    ['2026-10-03', firstWeek.slice(0, 2), weekly500, 'RM 295.00 left · 6 days left · ~RM 49.16/day', 'calm'],
    ['2026-10-04', firstWeek.slice(0, 3), weekly500, 'RM 249.50 left · 5 days left · ~RM 49.90/day', 'calm'],
    ['2026-10-05', firstWeek.slice(0, 4), weekly500, 'RM 69.50 left · 4 days left · ~RM 17.37/day', 'warning'],
    ['2026-10-06', firstWeek.slice(0, 4), weekly500, 'RM 69.50 left · 3 days left · ~RM 23.16/day', 'warning'],
    ['2026-10-06', firstWeek.slice(0, 4), weekly600, 'RM 169.50 left · 3 days left · ~RM 56.50/day', 'calm'],
    ['2026-10-07', firstWeek, weekly600, 'RM 40.50 over', 'over'],
    ['2026-10-08', firstWeek, weekly600, 'RM 40.50 over', 'over'],
  ];

  it.each(table)('on %s reads as the worked example', (today, entries, plan, text, tone) => {
    const bar = budgetBar(plan, entries, today);
    expect(budgetText(bar)).toBe(text);
    expect(bar.tone).toBe(tone);
  });

  it('starts the next week fresh with no carry-over', () => {
    const bar = budgetBar(weekly600, firstWeek, '2026-10-09');
    expect(budgetText(bar)).toBe('RM 600.00 left · 7 days left · ~RM 85.71/day');
    expect(bar.tone).toBe('calm');
  });

  it('counts every expense and no income, Saving included', () => {
    const entries = [
      expense('2026-10-03', 10000),
      income('2026-10-03', 900000),
      saving('2026-09-25', '2026-10-01', 50000, 50000),
    ];
    expect(budgetBar(weekly500, entries, '2026-10-04').spentSen).toBe(10000);
  });

  it('counts today among the days left and ends on one', () => {
    const bar = budgetBar(weekly500, [], '2026-10-08');
    expect(bar.daysLeft).toBe(1);
    expect(budgetText(bar)).toBe('RM 500.00 left · 1 day left · ~RM 500.00/day');
  });

  it.each([
    [37000, 'calm'],
    [37500, 'warning'],
    [50000, 'warning'],
    [50001, 'over'],
  ])('after spending %i sen of 50000 the tone is %s', (spent, tone) => {
    const bar = budgetBar(weekly500, [expense('2026-10-02', spent)], '2026-10-02');
    expect(bar.tone).toBe(tone);
  });

  it('shows exactly RM 0.00 left rather than over', () => {
    const bar = budgetBar(weekly500, [expense('2026-10-02', 50000)], '2026-10-04');
    expect(budgetText(bar)).toBe('RM 0.00 left · 5 days left · ~RM 0.00/day');
  });

  it('shows a single sen over', () => {
    const bar = budgetBar(weekly500, [expense('2026-10-02', 50001)], '2026-10-04');
    expect(budgetText(bar)).toBe('RM 0.01 over');
  });
});

describe('changing the budget', () => {
  it('anchors the first budget to the day it is set', () => {
    expect(applyBudgetEdit(null, { amountSen: 50000, period: 'week' }, '2026-10-02')).toEqual(
      weekly500,
    );
  });

  it('applies a new amount to the current period straight away', () => {
    expect(
      applyBudgetEdit(weekly500, { amountSen: 60000, period: 'week' }, '2026-10-06'),
    ).toEqual(weekly600);
  });

  it('waits for the current week to end before switching to monthly', () => {
    const plan = applyBudgetEdit(
      weekly600,
      { amountSen: 240000, period: 'month' },
      '2026-10-14',
    );
    expect(plan).toEqual({
      ...weekly600,
      next: { period: 'month', from: '2026-10-16', amountSen: 240000 },
    });

    const before = budgetBar(plan, [], '2026-10-15');
    expect(before.period).toEqual({
      start: '2026-10-09',
      end: '2026-10-15',
      amountSen: 60000,
    });
    expect(before.switchNote).toBe('Monthly budget starts Fri 16 Oct');

    const after = budgetBar(plan, [], '2026-10-16');
    expect(after.period).toEqual({
      start: '2026-10-16',
      end: '2026-11-15',
      amountSen: 240000,
    });
    expect(after.switchNote).toBeNull();
  });

  it('cancels a pending switch when the current type is chosen again', () => {
    const pending = applyBudgetEdit(
      weekly600,
      { amountSen: 240000, period: 'month' },
      '2026-10-14',
    );
    expect(
      applyBudgetEdit(pending, { amountSen: 60000, period: 'week' }, '2026-10-14'),
    ).toEqual(weekly600);
  });

  it('folds a switch into the plan only once its day arrives', () => {
    const pending = applyBudgetEdit(
      weekly600,
      { amountSen: 240000, period: 'month' },
      '2026-10-14',
    );
    expect(foldPlan(pending, '2026-10-15')).toBe(pending);
    expect(foldPlan(pending, '2026-10-16')).toEqual({
      amountSen: 240000,
      period: 'month',
      anchor: '2026-10-16',
      next: null,
    });
  });

  it('notes a pending weekly switch too', () => {
    const monthly: BudgetPlan = {
      amountSen: 200000,
      period: 'month',
      anchor: '2026-10-16',
      next: null,
    };
    const plan = applyBudgetEdit(monthly, { amountSen: 50000, period: 'week' }, '2026-10-20');
    expect(budgetBar(plan, [], '2026-10-20').switchNote).toBe(
      'Weekly budget starts Mon 16 Nov',
    );
  });
});

describe('Saving entries', () => {
  it('closes one ended period with budget minus spent, on its last day', () => {
    expect(missingSavings(weekly600, firstWeek, '2026-10-09')).toEqual([
      {
        amountSen: -4050,
        date: '2026-10-08',
        periodStart: '2026-10-02',
        budgetSen: 60000,
      },
    ]);
  });

  it('never closes the period still running', () => {
    expect(missingSavings(weekly600, firstWeek, '2026-10-08')).toEqual([]);
  });

  it('backfills every week missed while the app was closed', () => {
    expect(missingSavings(weekly600, firstWeek, '2026-10-26')).toEqual([
      { amountSen: -4050, date: '2026-10-08', periodStart: '2026-10-02', budgetSen: 60000 },
      { amountSen: 60000, date: '2026-10-15', periodStart: '2026-10-09', budgetSen: 60000 },
      { amountSen: 60000, date: '2026-10-22', periodStart: '2026-10-16', budgetSen: 60000 },
    ]);
  });

  it('skips periods that already have a Saving entry', () => {
    const first = missingSavings(weekly600, firstWeek, '2026-10-19');
    const written: Entry[] = first.map((row) =>
      saving(row.periodStart, row.date, row.budgetSen, row.amountSen),
    );
    expect(missingSavings(weekly600, [...firstWeek, ...written], '2026-10-19')).toEqual([]);
  });

  it('writes a zero Saving when the budget was spent exactly', () => {
    expect(
      missingSavings(weekly500, [expense('2026-10-04', 50000)], '2026-10-09'),
    ).toEqual([
      { amountSen: 0, date: '2026-10-08', periodStart: '2026-10-02', budgetSen: 50000 },
    ]);
  });

  it('settles both sides of a switch made before a long absence', () => {
    const plan = applyBudgetEdit(
      weekly600,
      { amountSen: 240000, period: 'month' },
      '2026-10-14',
    );
    expect(
      missingSavings(plan, [expense('2026-10-20', 10000)], '2026-11-20'),
    ).toEqual([
      { amountSen: 60000, date: '2026-10-08', periodStart: '2026-10-02', budgetSen: 60000 },
      { amountSen: 60000, date: '2026-10-15', periodStart: '2026-10-09', budgetSen: 60000 },
      { amountSen: 230000, date: '2026-11-15', periodStart: '2026-10-16', budgetSen: 240000 },
    ]);
  });

  it('decides the day by the Malaysia date, just after midnight', () => {
    const justAfter = malaysiaDate(new Date('2026-10-08T16:05:00Z'));
    const justBefore = malaysiaDate(new Date('2026-10-08T15:59:00Z'));
    expect(justAfter).toBe('2026-10-09');
    expect(justBefore).toBe('2026-10-08');
    expect(missingSavings(weekly600, firstWeek, justAfter)).toHaveLength(1);
    expect(missingSavings(weekly600, firstWeek, justBefore)).toHaveLength(0);
    expect(budgetBar(weekly600, firstWeek, justAfter).period.start).toBe('2026-10-09');
  });
});

describe('recalculating a closed period', () => {
  const closedFirst = saving('2026-10-02', '2026-10-08', 60000, -4050);
  const closedSecond = saving('2026-10-09', '2026-10-15', 60000, 60000);
  const base: Entry[] = [...firstWeek, closedFirst, closedSecond];

  it('lowers the Saving when an expense is added inside it', () => {
    const lunch = expense('2026-10-07', 1200);
    expect(savingRecalcs([...base, lunch], [lunch.date])).toEqual([
      { id: closedFirst.id, amountSen: -5250 },
    ]);
  });

  it('raises the Saving when an expense inside it is deleted', () => {
    const remaining = base.filter((entry) => entry !== firstWeek[4]);
    expect(savingRecalcs(remaining, [firstWeek[4].date])).toEqual([
      { id: closedFirst.id, amountSen: 60000 - 43050 },
    ]);
  });

  it('follows an edited amount by the difference', () => {
    const edited = base.map((entry) =>
      entry === firstWeek[4] ? { ...firstWeek[4], amountSen: 20000 } : entry,
    );
    expect(savingRecalcs(edited, [firstWeek[4].date])).toEqual([
      { id: closedFirst.id, amountSen: -3050 },
    ]);
  });

  it('recalculates both periods when an entry moves between them', () => {
    const moved = { ...firstWeek[4], date: '2026-10-10' };
    const edited = base.map((entry) => (entry === firstWeek[4] ? moved : entry));
    expect(savingRecalcs(edited, ['2026-10-07', '2026-10-10'])).toEqual([
      { id: closedFirst.id, amountSen: 60000 - 43050 },
      { id: closedSecond.id, amountSen: 60000 - 21000 },
    ]);
  });

  it('recalculates only the closed side when an entry moves into the open period', () => {
    const moved = { ...firstWeek[4], date: '2026-10-17' };
    const edited = base.map((entry) => (entry === firstWeek[4] ? moved : entry));
    expect(savingRecalcs(edited, ['2026-10-07', '2026-10-17'])).toEqual([
      { id: closedFirst.id, amountSen: 60000 - 43050 },
    ]);
  });

  it('touches nothing for an entry in the open period', () => {
    const today = expense('2026-10-17', 5000);
    expect(savingRecalcs([...base, today], [today.date])).toEqual([]);
  });

  it('uses the budget the period closed with, not the current one', () => {
    const plan = applyBudgetEdit(weekly600, { amountSen: 90000, period: 'week' }, '2026-10-17');
    expect(plan.amountSen).toBe(90000);
    const lunch = expense('2026-10-07', 1200);
    expect(savingRecalcs([...base, lunch], [lunch.date])).toEqual([
      { id: closedFirst.id, amountSen: 60000 - 65250 },
    ]);
  });

  it('ignores income added inside a closed period', () => {
    const pay = income('2026-10-07', 300000);
    expect(savingRecalcs([...base, pay], [pay.date])).toEqual([]);
  });

  it('counts each period once when two touched dates share it', () => {
    const lunch = expense('2026-10-07', 1200);
    expect(savingRecalcs([...base, lunch], ['2026-10-03', '2026-10-07'])).toEqual([
      { id: closedFirst.id, amountSen: -5250 },
    ]);
  });

  it('handles Yesterday on the first day of a new period', () => {
    const today = '2026-10-09';
    const settled = missingSavings(weekly600, firstWeek, today).map((row) =>
      saving(row.periodStart, row.date, row.budgetSen, row.amountSen),
    );
    expect(settled.map((row) => row.amountSen)).toEqual([-4050]);

    const lunch = expense('2026-10-08', 1200);
    const after: Entry[] = [...firstWeek, ...settled, lunch];
    expect(savingRecalcs(after, [lunch.date])).toEqual([
      { id: settled[0].id, amountSen: -5250 },
    ]);
    expect(budgetText(budgetBar(weekly600, after, today))).toBe(
      'RM 600.00 left · 7 days left · ~RM 85.71/day',
    );
  });

  it('heals every stale Saving on load', () => {
    const stale = saving('2026-10-02', '2026-10-08', 60000, 0);
    expect(allSavingRecalcs([...firstWeek, stale, closedSecond])).toEqual([
      { id: stale.id, amountSen: -4050 },
    ]);
  });
});

describe('showing recalculated Savings', () => {
  it('swaps in the new amounts and leaves every other entry alone', () => {
    const closed = saving('2026-10-02', '2026-10-08', 60000, -4050);
    const lunch = expense('2026-10-07', 1200);
    const result = withSavingUpdates([closed, lunch], [{ id: closed.id, amountSen: -5250 }]);
    expect(result).toEqual([{ ...closed, amountSen: -5250 }, lunch]);
    expect(result[1]).toBe(lunch);
  });
});

describe('the bar on a narrow screen', () => {
  it('splits the money left from the days and daily figure', () => {
    expect(budgetLines(budgetBar(weekly500, firstWeek.slice(0, 1), '2026-10-02'))).toEqual({
      headline: 'RM 415.00 left',
      detail: '7 days left · ~RM 59.28/day',
    });
  });

  it('shows only the overspend when over', () => {
    expect(budgetLines(budgetBar(weekly600, firstWeek, '2026-10-07'))).toEqual({
      headline: 'RM 40.50 over',
      detail: null,
    });
  });
});

describe('the water tank', () => {
  it('fills to the share still left and reads out the week', () => {
    expect(budgetTank(budgetBar(weekly500, firstWeek.slice(0, 1), '2026-10-02'))).toEqual({
      level: 0.83,
      amount: 'RM 415.00',
      caption: 'left of RM 500.00',
      stats: [
        { label: 'Spent', value: 'RM 85.00' },
        { label: 'Time', value: '7 days left' },
        { label: 'Daily limit', value: '~RM 59.28' },
      ],
    });
  });

  it('says one day, not one days', () => {
    expect(budgetTank(budgetBar(weekly500, [], '2026-10-08')).stats[1].value).toBe('1 day left');
  });

  it('runs dry with no daily limit once the money is gone', () => {
    const tank = budgetTank(budgetBar(weekly500, [expense('2026-10-02', 50000)], '2026-10-04'));
    expect(tank.level).toBe(0);
    expect(tank.amount).toBe('RM 0.00');
    expect(tank.stats[2].value).toBe('RM 0.00');
  });

  it('fills back up by the share overspent and names the overspend', () => {
    expect(budgetTank(budgetBar(weekly600, firstWeek, '2026-10-07'))).toMatchObject({
      level: 0.0675,
      amount: 'RM 40.50',
      caption: 'over the RM 600.00 budget',
    });
  });

  it('tops out once the overspend matches the budget', () => {
    const doubled = budgetBar(weekly500, [expense('2026-10-02', 100000)], '2026-10-02');
    const beyond = budgetBar(weekly500, [expense('2026-10-02', 160000)], '2026-10-02');
    expect(budgetTank(doubled).level).toBe(1);
    expect(budgetTank(beyond).level).toBe(1);
  });
});
