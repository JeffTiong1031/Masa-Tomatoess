import { describe, it, expect } from 'vitest';
import { assistantFailureMessage, reasonForStatus } from './assistantFailure';
import type { Reason } from './assistantReply';

const EVERY_REASON: Reason[] = [
  { kind: 'unknownKind' },
  { kind: 'shapeMismatch' },
  { kind: 'badChangeCount', count: 34 },
  { kind: 'unknownHandle', handle: 't99' },
  { kind: 'emptyTitle' },
  { kind: 'badDate', value: '12/09/2026' },
  { kind: 'badTime', value: '3pm' },
  { kind: 'yearOutOfRange', year: 2087 },
  { kind: 'unknownCategory', name: 'Zumba' },
  { kind: 'duplicateHandle', handle: 't1' },
  { kind: 'formRejection', message: 'The end time must be after the start.' },
  { kind: 'unconfigured' },
  { kind: 'quota' },
  { kind: 'offline' },
  { kind: 'timeout' },
  { kind: 'serverError' },
];

describe('assistantFailureMessage', () => {
  it('gives every reason its own wording', () => {
    const messages = EVERY_REASON.map(assistantFailureMessage);
    expect(new Set(messages).size).toBe(EVERY_REASON.length);
  });

  it('never returns an empty string', () => {
    for (const message of EVERY_REASON.map(assistantFailureMessage)) {
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('quotes the real change count', () => {
    expect(assistantFailureMessage({ kind: 'badChangeCount', count: 34 })).toContain('34');
    expect(assistantFailureMessage({ kind: 'badChangeCount', count: 7 })).toContain('7');
  });

  it('quotes the real year', () => {
    expect(assistantFailureMessage({ kind: 'yearOutOfRange', year: 2087 })).toContain('2087');
    expect(assistantFailureMessage({ kind: 'yearOutOfRange', year: 202 })).toContain('202');
  });

  it('quotes the real category name', () => {
    expect(assistantFailureMessage({ kind: 'unknownCategory', name: 'Zumba' })).toContain('Zumba');
  });

  it('passes a form rejection through word for word', () => {
    expect(
      assistantFailureMessage({ kind: 'formRejection', message: 'The end time must be after the start.' }),
    ).toBe('The end time must be after the start.');
  });
});

describe('reasonForStatus', () => {
  it('maps the statuses the routes return', () => {
    expect(reasonForStatus(503)).toEqual({ kind: 'unconfigured' });
    expect(reasonForStatus(429)).toEqual({ kind: 'quota' });
    expect(reasonForStatus(500)).toEqual({ kind: 'serverError' });
    expect(reasonForStatus(502)).toEqual({ kind: 'serverError' });
  });
});
