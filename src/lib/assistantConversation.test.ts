import { describe, it, expect } from 'vitest';
import { capStatus, countFromYou, historyFor, type Entry } from './assistantConversation';
import { MAX_MESSAGE_CHARS } from './assistantBody';
import type { PlannedChange, TodoChange } from './todoPlan';

function change(overrides: Partial<TodoChange> = {}): TodoChange {
  return {
    op: 'add',
    handle: 't1',
    title: 'Dentist',
    dueDate: '',
    dueTime: '',
    priority: false,
    ...overrides,
  };
}

function planned(overrides: Partial<PlannedChange> = {}): PlannedChange {
  return {
    change: change(),
    id: null,
    outcome: 'pending',
    note: '',
    ...overrides,
  };
}

describe('historyFor', () => {
  it('lists only the saved handles on a partial apply', () => {
    const entries: Entry[] = [
      {
        kind: 'plan',
        summary: 'Move two tasks',
        cancelled: false,
        planned: [
          planned({ change: change({ handle: 't1' }), outcome: 'saved' }),
          planned({ change: change({ handle: 't2' }), outcome: 'failed' }),
          planned({ change: change({ handle: 't3' }), outcome: 'notAttempted' }),
        ],
      },
    ];

    expect(historyFor(entries)).toEqual([
      { role: 'assistant', text: 'Applied: Move two tasks (t1)' },
    ]);
  });

  it('lists every handle when every change saved', () => {
    const entries: Entry[] = [
      {
        kind: 'plan',
        summary: 'Move two tasks',
        cancelled: false,
        planned: [
          planned({ change: change({ handle: 't1' }), outcome: 'saved' }),
          planned({ change: change({ handle: 't2' }), outcome: 'saved' }),
        ],
      },
    ];

    expect(historyFor(entries)).toEqual([
      { role: 'assistant', text: 'Applied: Move two tasks (t1, t2)' },
    ]);
  });

  it('sends a cancelled plan back as one line', () => {
    const entries: Entry[] = [
      {
        kind: 'plan',
        summary: 'Delete the dentist task',
        cancelled: true,
        planned: [planned({ outcome: 'pending' })],
      },
    ];

    expect(historyFor(entries)).toEqual([
      { role: 'assistant', text: 'You cancelled: Delete the dentist task' },
    ]);
  });

  it('carries the full change list for an open plan', () => {
    const oneChange = change({ handle: 't1', title: 'Dentist', dueDate: '2026-09-12' });
    const entries: Entry[] = [
      {
        kind: 'plan',
        summary: 'Move the dentist',
        cancelled: false,
        planned: [planned({ change: oneChange, outcome: 'pending' })],
      },
    ];

    expect(historyFor(entries)).toEqual([
      {
        role: 'assistant',
        text: `Open plan, not yet applied: Move the dentist\n${JSON.stringify([oneChange])}`,
      },
    ]);
  });

  function bigPlan(count: number): PlannedChange[] {
    const list: PlannedChange[] = [];
    for (let i = 0; i < count; i += 1) {
      list.push(planned({ change: change({ handle: `t${i}` }), outcome: 'pending' }));
    }
    return list;
  }

  it('still sends the full change list when it fits under the cap', () => {
    const summary = 'Move things around';
    const ten = bigPlan(10);
    const entries: Entry[] = [{ kind: 'plan', summary, cancelled: false, planned: ten }];

    const fullText = `Open plan, not yet applied: ${summary}\n${JSON.stringify(ten.map((p) => p.change))}`;
    expect(fullText.length).toBeLessThanOrEqual(MAX_MESSAGE_CHARS);

    expect(historyFor(entries)).toEqual([{ role: 'assistant', text: fullText }]);
  });

  it('sends a plain sentence instead of the change list once it would exceed the cap', () => {
    const summary = 'Move things around';
    const eleven = bigPlan(11);
    const entries: Entry[] = [{ kind: 'plan', summary, cancelled: false, planned: eleven }];

    const fullText = `Open plan, not yet applied: ${summary}\n${JSON.stringify(eleven.map((p) => p.change))}`;
    expect(fullText.length).toBeGreaterThan(MAX_MESSAGE_CHARS);

    expect(historyFor(entries)).toEqual([
      {
        role: 'assistant',
        text: `Open plan, not yet applied: ${summary}\nThis plan has 11 changes and is still waiting.`,
      },
    ]);
  });

  it('passes text entries through with their role', () => {
    const entries: Entry[] = [
      { kind: 'text', role: 'you', text: 'Move dentist to Friday' },
      { kind: 'text', role: 'assistant', text: 'Which one?' },
    ];

    expect(historyFor(entries)).toEqual([
      { role: 'you', text: 'Move dentist to Friday' },
      { role: 'assistant', text: 'Which one?' },
    ]);
  });
});

describe('countFromYou', () => {
  it('counts only your text entries', () => {
    const entries: Entry[] = [
      { kind: 'text', role: 'you', text: 'Move dentist to Friday' },
      { kind: 'text', role: 'assistant', text: 'Which one?' },
      { kind: 'text', role: 'you', text: 'The 3pm one' },
      {
        kind: 'plan',
        summary: 'Move it',
        cancelled: false,
        planned: [planned()],
      },
    ];

    expect(countFromYou(entries)).toBe(2);
  });

  it('is zero with no entries', () => {
    expect(countFromYou([])).toBe(0);
  });
});

describe('capStatus', () => {
  it('is neither full nor warning with the full allowance left', () => {
    expect(capStatus(0)).toEqual({ remaining: 6, full: false, warn: false });
  });

  it('warns at two remaining', () => {
    expect(capStatus(4)).toEqual({ remaining: 2, full: false, warn: true });
  });

  it('is full at zero remaining', () => {
    expect(capStatus(6)).toEqual({ remaining: 0, full: true, warn: true });
  });
});
