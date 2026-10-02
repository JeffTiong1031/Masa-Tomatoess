import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data?: unknown; error: { code?: string } | null };

const mocks = vi.hoisted(() => {
  const methods = [
    'select',
    'eq',
    'is',
    'order',
    'range',
    'insert',
    'update',
    'upsert',
    'delete',
    'single',
    'maybeSingle',
  ] as const;
  const tables = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
  const results = new Map<string, Result[]>();
  const queryFor = (table: string) => {
    const existing = tables.get(table);
    if (existing) return existing;
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of methods) query[method] = vi.fn(() => query);
    query.then = vi.fn((resolve: (value: Result) => unknown) => {
      const queue = results.get(table) ?? [];
      return resolve(queue.length > 1 ? queue.shift()! : (queue[0] ?? { data: [], error: null }));
    });
    tables.set(table, query);
    return query;
  };
  const from = vi.fn((table: string) => queryFor(table));
  return { from, tables, results, queryFor };
});

vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }));

import {
  ENTRY_PAGE,
  ensureSaving,
  insertCategory,
  insertSavings,
  loadFinance,
  restoreEntry,
} from './financeRepo';

function respond(table: string, ...queue: Result[]) {
  mocks.results.set(table, queue);
}

function entryRow(index: number) {
  return {
    id: `id-${index}`,
    kind: 'expense',
    amount_sen: 100,
    category_id: 'food',
    date: '2026-10-02',
    note: null,
    period_start: null,
    budget_sen: null,
    created_at: '2026-10-02T00:00:00Z',
  };
}

describe('finance cloud repository', () => {
  beforeEach(() => {
    mocks.tables.clear();
    mocks.results.clear();
    vi.clearAllMocks();
    respond('finance_budgets', { data: null, error: null });
  });

  it('reads only the signed-in person\'s rows from every table', async () => {
    await loadFinance('Rachel');
    for (const table of [
      'finance_categories',
      'finance_entries',
      'finance_templates',
      'finance_budgets',
    ]) {
      const query = mocks.queryFor(table);
      expect(query.eq).toHaveBeenCalledWith('owner', 'Rachel');
      expect(query.eq).not.toHaveBeenCalledWith('owner', 'Jeff');
    }
  });

  it('reads entries in pages until a short page arrives', async () => {
    const full = Array.from({ length: ENTRY_PAGE }, (_, i) => entryRow(i));
    respond('finance_entries', { data: full, error: null }, { data: [entryRow(9999)], error: null });

    const result = await loadFinance('Jeff');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data.entries).toHaveLength(ENTRY_PAGE + 1);
    const entries = mocks.queryFor('finance_entries');
    expect(entries.range).toHaveBeenNthCalledWith(1, 0, ENTRY_PAGE - 1);
    expect(entries.range).toHaveBeenNthCalledWith(2, ENTRY_PAGE, 2 * ENTRY_PAGE - 1);
  });

  it('turns a Saving row into a Saving entry with its closing budget', async () => {
    respond('finance_entries', {
      data: [{ ...entryRow(1), kind: 'income', period_start: '2026-10-02', budget_sen: 60000 }],
      error: null,
    });
    const result = await loadFinance('Jeff');
    expect(result.status === 'ok' && result.data.entries[0]).toMatchObject({
      source: 'saving',
      periodStart: '2026-10-02',
      budgetSen: 60000,
    });
  });

  it('reports a missing table so the page can name the SQL file', async () => {
    respond('finance_categories', { data: null, error: { code: 'PGRST205' } });
    await expect(loadFinance('Jeff')).resolves.toEqual({ status: 'missing-table' });
  });

  it('creates Saving without ever making a second one', async () => {
    await expect(ensureSaving('Jeff')).resolves.toBe(true);
    expect(mocks.queryFor('finance_categories').upsert).toHaveBeenCalledWith(
      { owner: 'Jeff', kind: 'income', name: 'Saving', system: 'saving' },
      { onConflict: 'owner,system', ignoreDuplicates: true },
    );
  });

  it('asks the database to skip periods that already have a Saving entry', async () => {
    await insertSavings('Jeff', 'saving-id', [
      { amountSen: -4050, date: '2026-10-08', periodStart: '2026-10-02', budgetSen: 60000 },
    ]);
    expect(mocks.queryFor('finance_entries').upsert).toHaveBeenCalledWith(
      [
        {
          owner: 'Jeff',
          kind: 'income',
          amount_sen: -4050,
          category_id: 'saving-id',
          date: '2026-10-08',
          note: null,
          period_start: '2026-10-02',
          budget_sen: 60000,
        },
      ],
      { onConflict: 'owner,period_start', ignoreDuplicates: true },
    );
  });

  it('puts an undone entry back under its original id', async () => {
    await restoreEntry('Jeff', {
      id: 'original',
      source: 'hand',
      kind: 'expense',
      amountSen: 1200,
      categoryId: 'food',
      date: '2026-10-08',
      note: 'Lunch',
      createdAt: '2026-10-08T05:00:00Z',
    });
    expect(mocks.queryFor('finance_entries').insert).toHaveBeenCalledWith({
      owner: 'Jeff',
      kind: 'expense',
      amount_sen: 1200,
      category_id: 'food',
      date: '2026-10-08',
      note: 'Lunch',
      id: 'original',
      created_at: '2026-10-08T05:00:00Z',
    });
  });

  it('tells a clashing category name apart from a failure', async () => {
    respond('finance_categories', { data: null, error: { code: '23505' } });
    await expect(insertCategory('Jeff', 'expense', 'Food')).resolves.toEqual({
      status: 'duplicate',
    });
  });
});
