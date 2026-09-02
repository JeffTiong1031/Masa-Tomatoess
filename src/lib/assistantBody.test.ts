import { describe, it, expect } from 'vitest';
import {
  MAX_HISTORY,
  MAX_MESSAGE_CHARS,
  MAX_TITLE_CHARS,
  parseAssistantBody,
  parseCalendarBody,
} from './assistantBody';
import { MAX_EVENT_ROWS, MAX_NOTE_CHARS, MAX_TODO_ROWS } from './assistantContext';

function row(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    handle: 't1',
    title: 'task',
    dueDate: '',
    dueTime: '',
    priority: false,
    done: false,
    ...overrides,
  };
}

function snapshot(rows: unknown[] = [row()]): Record<string, unknown> {
  return {
    today: '2026-09-01',
    weekday: 'Tue',
    now: '14:30:00',
    rows,
  };
}

function message(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return { role: 'you', text: 'hello', ...overrides };
}

function body(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return { snapshot: snapshot(), history: [message()], ...overrides };
}

describe('parseAssistantBody', () => {
  it('accepts a well-formed body', () => {
    const result = parseAssistantBody(body());
    expect(result.ok).toBe(true);
  });

  it('rejects a history of 13 entries', () => {
    const history = Array.from({ length: MAX_HISTORY + 1 }, () => message());
    const result = parseAssistantBody(body({ history }));
    expect(result.ok).toBe(false);
  });

  it('accepts a history of 12 entries', () => {
    const history = Array.from({ length: MAX_HISTORY }, () => message());
    const result = parseAssistantBody(body({ history }));
    expect(result.ok).toBe(true);
  });

  it('rejects a history entry whose role is neither you nor assistant', () => {
    const result = parseAssistantBody(body({ history: [message({ role: 'system' })] }));
    expect(result.ok).toBe(false);
  });

  it('rejects a message longer than MAX_MESSAGE_CHARS', () => {
    const text = 'a'.repeat(MAX_MESSAGE_CHARS + 1);
    const result = parseAssistantBody(body({ history: [message({ text })] }));
    expect(result.ok).toBe(false);
  });

  it('rejects rows containing a non-object', () => {
    const result = parseAssistantBody(body({ snapshot: snapshot([1, 2]) }));
    expect(result.ok).toBe(false);
  });

  it('rejects a row whose priority is a string rather than a boolean', () => {
    const result = parseAssistantBody(body({ snapshot: snapshot([row({ priority: 'true' })]) }));
    expect(result.ok).toBe(false);
  });

  it('rejects a row whose title exceeds MAX_TITLE_CHARS', () => {
    const title = 'a'.repeat(MAX_TITLE_CHARS + 1);
    const result = parseAssistantBody(body({ snapshot: snapshot([row({ title })]) }));
    expect(result.ok).toBe(false);
  });

  it('accepts a row whose title is exactly at MAX_TITLE_CHARS', () => {
    const title = 'a'.repeat(MAX_TITLE_CHARS);
    const result = parseAssistantBody(body({ snapshot: snapshot([row({ title })]) }));
    expect(result.ok).toBe(true);
  });

  it('rejects more than MAX_TODO_ROWS rows', () => {
    const rows = Array.from({ length: MAX_TODO_ROWS + 1 }, () => row());
    const result = parseAssistantBody(body({ snapshot: snapshot(rows) }));
    expect(result.ok).toBe(false);
  });

  it('rejects a body that is not an object at all', () => {
    const result = parseAssistantBody('not an object');
    expect(result.ok).toBe(false);
  });
});

function calRow(over: Record<string, unknown> = {}) {
  return {
    handle: 'e1',
    title: 'Standup',
    date: '2026-09-03',
    endDate: '',
    startTime: '09:00',
    endTime: '',
    countdown: false,
    category: 'Work',
    notes: '',
    ...over,
  };
}

function calBody(over: Record<string, unknown> = {}) {
  return {
    snapshot: {
      today: '2026-09-02',
      weekday: 'Wed',
      now: '14:30:00',
      from: '2026-08-03',
      to: '2026-12-01',
      categories: ['Work'],
      rows: [calRow()],
      ...over,
    },
    history: [{ role: 'you', text: 'what is on Thursday?' }],
  };
}

describe('parseCalendarBody', () => {
  it('accepts a well-formed body', () => {
    const parsed = parseCalendarBody(calBody());
    expect(parsed.ok).toBe(true);
  });

  it('accepts an empty board', () => {
    expect(parseCalendarBody(calBody({ rows: [] })).ok).toBe(true);
  });

  it('rejects a body that is not an object', () => {
    expect(parseCalendarBody('hello')).toEqual({ ok: false });
  });

  it('rejects a snapshot missing its window', () => {
    const body = calBody();
    delete (body.snapshot as Record<string, unknown>).to;
    expect(parseCalendarBody(body)).toEqual({ ok: false });
  });

  it('rejects a row with a field of the wrong type', () => {
    expect(parseCalendarBody(calBody({ rows: [calRow({ countdown: 'yes' })] }))).toEqual({
      ok: false,
    });
  });

  it('rejects a title longer than the cap', () => {
    expect(
      parseCalendarBody(calBody({ rows: [calRow({ title: 'x'.repeat(MAX_TITLE_CHARS + 1) })] })),
    ).toEqual({ ok: false });
  });

  it('rejects notes longer than the cap', () => {
    expect(
      parseCalendarBody(calBody({ rows: [calRow({ notes: 'x'.repeat(MAX_NOTE_CHARS + 1) })] })),
    ).toEqual({ ok: false });
  });

  it('rejects more rows than the cap allows', () => {
    const rows = Array.from({ length: MAX_EVENT_ROWS + 1 }, () => calRow());
    expect(parseCalendarBody(calBody({ rows }))).toEqual({ ok: false });
  });

  it('rejects a category list that is not strings', () => {
    expect(parseCalendarBody(calBody({ categories: [1, 2] }))).toEqual({ ok: false });
  });

  it('rejects an empty history', () => {
    expect(parseCalendarBody({ ...calBody(), history: [] })).toEqual({ ok: false });
  });

  it('rejects a history longer than the cap', () => {
    const history = Array.from({ length: MAX_HISTORY + 1 }, () => ({ role: 'you', text: 'hi' }));
    expect(parseCalendarBody({ ...calBody(), history })).toEqual({ ok: false });
  });
});
