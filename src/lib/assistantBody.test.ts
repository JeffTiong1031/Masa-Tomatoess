import { describe, it, expect } from 'vitest';
import { MAX_HISTORY, MAX_MESSAGE_CHARS, MAX_TITLE_CHARS, parseAssistantBody } from './assistantBody';
import { MAX_TODO_ROWS } from './assistantContext';

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
