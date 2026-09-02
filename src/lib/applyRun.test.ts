import { describe, it, expect } from 'vitest';
import { applySummary, runPlan, type ChangeRunner } from './applyRun';
import { assignHandles, emptyHandleMap } from './assistantContext';
import { APPLY_BUDGET_MS, UNREACHED_LIMIT } from './assistantRun';
import type { PlannedChange, TodoChange } from './todoPlan';
import type { OpenTodo } from './todo';

const MAP = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);

function change(overrides: Partial<TodoChange> = {}): TodoChange {
  return {
    op: 'edit',
    handle: 't1',
    title: 'Dentist',
    dueDate: '2026-09-12',
    dueTime: '',
    priority: false,
    ...overrides,
  };
}

function planned(overrides: Partial<PlannedChange> = {}): PlannedChange {
  return {
    change: change(),
    id: 'aaa',
    outcome: 'pending',
    note: '',
    ...overrides,
  };
}

function row(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'aaa',
    owner: 'Jeff',
    title: 'Dentist',
    dueDate: '2026-09-12',
    dueTime: null,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

const NEVER_CALLED: ChangeRunner = async () => {
  throw new Error('the runner should not have been called');
};

describe('runPlan', () => {
  it('passes saved and stale entries through untouched without calling the runner', async () => {
    const calls: PlannedChange[] = [];
    const run: ChangeRunner = async (entry) => {
      calls.push(entry);
      return 'saved';
    };

    const savedEntry = planned({ outcome: 'saved', note: 'already saved' });
    const staleEntry = planned({ outcome: 'stale', note: 'That task was already deleted.' });

    const results = await runPlan([savedEntry, staleEntry], MAP, [], run, () => 0);

    expect(results).toEqual([savedEntry, staleEntry]);
    expect(calls).toHaveLength(0);
  });

  it('marks a change stale and does not run it when its row is missing from the live rows', async () => {
    const results = await runPlan(
      [planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'pending' })],
      MAP,
      [],
      NEVER_CALLED,
      () => 0,
    );

    expect(results[0].outcome).toBe('stale');
    expect(results[0].note).toBe('That task was already deleted.');
  });

  it('gives a save an empty note, and gives one that collides with a different live row the clash note', async () => {
    const run: ChangeRunner = async () => 'saved';
    const live = [
      row({ id: 'aaa', title: 'Old title', dueDate: '2026-09-01' }),
      row({ id: 'bbb', title: 'Dentist', dueDate: '2026-09-12' }),
      row({ id: 'ccc', title: 'Old groceries', dueDate: '2026-09-05' }),
    ];

    const clashing = planned({
      change: change({ handle: 't1', title: 'Dentist', dueDate: '2026-09-12' }),
      id: 'aaa',
      outcome: 'pending',
    });
    const clean = planned({
      change: change({ handle: 't3', title: 'Groceries', dueDate: '2026-09-13' }),
      id: 'ccc',
      outcome: 'pending',
    });

    const results = await runPlan([clashing, clean], MAP, live, run, () => 0);

    expect(results[0].outcome).toBe('saved');
    expect(results[0].note).toBe('That day already had "Dentist".');
    expect(results[1].outcome).toBe('saved');
    expect(results[1].note).toBe('');
  });

  it('yields failed with the database-refused note when the runner refuses', async () => {
    const run: ChangeRunner = async () => 'failed';
    const live = [row({ id: 'aaa' })];

    const results = await runPlan([planned({ outcome: 'pending' })], MAP, live, run, () => 0);

    expect(results[0].outcome).toBe('failed');
    expect(results[0].note).toBe('The database refused it.');
  });

  it('yields uncertain with the took-too-long note when the runner cannot reach the database', async () => {
    const run: ChangeRunner = async () => 'unreached';
    const live = [row({ id: 'aaa' })];

    const results = await runPlan([planned({ outcome: 'pending' })], MAP, live, run, () => 0);

    expect(results[0].outcome).toBe('uncertain');
    expect(results[0].note).toBe('Took too long. It may have saved — check your list before trying again.');
  });

  it('stops after three unreached calls in a row and leaves the remainder not attempted', async () => {
    const run: ChangeRunner = async () => 'unreached';
    const live = [row({ id: 'aaa' }), row({ id: 'bbb' }), row({ id: 'ccc' })];

    const plan = [
      planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'pending' }),
      planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'pending' }),
      planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'pending' }),
      planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'pending' }),
    ];
    expect(plan).toHaveLength(UNREACHED_LIMIT + 1);

    const results = await runPlan(plan, MAP, live, run, () => 0);

    for (const result of results.slice(0, UNREACHED_LIMIT)) {
      expect(result.outcome).toBe('uncertain');
      expect(result.note).toBe('Took too long. It may have saved — check your list before trying again.');
    }
    expect(results[UNREACHED_LIMIT].outcome).toBe('notAttempted');
    expect(results[UNREACHED_LIMIT].note).toBe('Not tried — the run stopped.');
  });

  it('skips saved, stale and uncertain rows on a retry and only runs failed and notAttempted', async () => {
    const calls: PlannedChange[] = [];
    const run: ChangeRunner = async (entry) => {
      calls.push(entry);
      return 'saved';
    };
    const live = [row({ id: 'aaa' }), row({ id: 'bbb' }), row({ id: 'ccc' })];

    const savedEntry = planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'saved', note: '' });
    const failedEntry = planned({ change: change({ handle: 't2' }), id: 'bbb', outcome: 'failed', note: 'The database refused it.' });
    const notAttemptedEntry = planned({
      change: change({ handle: 't3' }),
      id: 'ccc',
      outcome: 'notAttempted',
      note: "Couldn't reach the database.",
    });

    const results = await runPlan([savedEntry, failedEntry, notAttemptedEntry], MAP, live, run, () => 0);

    expect(calls).toHaveLength(2);
    expect(calls.map((entry) => entry.change.handle)).toEqual(['t2', 't3']);
    expect(results[0]).toEqual(savedEntry);
    expect(results[1].outcome).toBe('saved');
    expect(results[2].outcome).toBe('saved');
  });

  it('stops when a jump in the clock spends the budget, leaving the remainder not attempted', async () => {
    let calls = 0;
    const now = () => {
      calls += 1;
      return calls === 1 ? 0 : APPLY_BUDGET_MS + 1;
    };
    const live = [row({ id: 'aaa' }), row({ id: 'bbb' })];

    const plan = [
      planned({ change: change({ handle: 't1' }), id: 'aaa', outcome: 'pending' }),
      planned({ change: change({ handle: 't2' }), id: 'bbb', outcome: 'pending' }),
    ];

    const results = await runPlan(plan, MAP, live, NEVER_CALLED, now);

    expect(results[0].outcome).toBe('notAttempted');
    expect(results[0].note).toBe('Not tried — the run stopped.');
    expect(results[1].outcome).toBe('notAttempted');
    expect(results[1].note).toBe('Not tried — the run stopped.');
  });
});

describe('applySummary', () => {
  it('gives an ok tone and a plural message when every change saved', () => {
    const results = [planned({ outcome: 'saved' }), planned({ outcome: 'saved' })];

    expect(applySummary(results)).toEqual({ message: 'Saved 2 changes.', tone: 'ok' });
  });

  it('does not pluralize a single saved change', () => {
    const results = [planned({ outcome: 'saved' })];

    expect(applySummary(results)).toEqual({ message: 'Saved 1 change.', tone: 'ok' });
  });

  it('gives a problem tone when only some changes saved', () => {
    const results = [
      planned({ outcome: 'saved' }),
      planned({ outcome: 'saved' }),
      planned({ outcome: 'failed' }),
    ];

    expect(applySummary(results)).toEqual({ message: '2 of 3 saved.', tone: 'problem' });
  });

  it('gives a problem tone and a distinct message when nothing saved', () => {
    const results = [planned({ outcome: 'failed' }), planned({ outcome: 'notAttempted' })];

    expect(applySummary(results)).toEqual({ message: 'Nothing saved.', tone: 'problem' });
  });
});
