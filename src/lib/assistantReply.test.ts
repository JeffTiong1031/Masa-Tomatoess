import { describe, it, expect } from 'vitest';
import { parseReply, MAX_CHANGES, type ChangeParser } from './assistantReply';

const acceptAny: ChangeParser<{ op: string }> = (raw) => ({
  ok: true,
  change: raw as { op: string },
});

function wire(overrides: Record<string, unknown> = {}) {
  return { kind: 'answer', text: 'You have three things Thursday.', summary: '', changes: [], ...overrides };
}

describe('parseReply', () => {
  it('accepts a text reply', () => {
    const result = parseReply(wire(), acceptAny);
    expect(result).toEqual({
      ok: true,
      reply: { kind: 'answer', text: 'You have three things Thursday.' },
    });
  });

  it('accepts a plan', () => {
    const result = parseReply(
      wire({ kind: 'plan', text: '', summary: 'Add one task', changes: [{ op: 'add' }] }),
      acceptAny,
    );
    expect(result).toEqual({
      ok: true,
      reply: { kind: 'plan', summary: 'Add one task', changes: [{ op: 'add' }] },
    });
  });

  it('rejects an unknown kind', () => {
    const result = parseReply(wire({ kind: 'shrug' }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a text reply carrying changes', () => {
    const result = parseReply(wire({ changes: [{ op: 'add' }] }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'shapeMismatch' } });
  });

  it('rejects a text reply carrying a summary', () => {
    const result = parseReply(wire({ summary: 'Add one task' }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'shapeMismatch' } });
  });

  it('rejects a plan carrying stray text', () => {
    const result = parseReply(
      wire({ kind: 'plan', text: 'here you go', summary: 'Add one task', changes: [{ op: 'add' }] }),
      acceptAny,
    );
    expect(result).toEqual({ ok: false, reason: { kind: 'shapeMismatch' } });
  });

  it('rejects a plan with no changes', () => {
    const result = parseReply(wire({ kind: 'plan', text: '', summary: 'nothing', changes: [] }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'badChangeCount', count: 0 } });
  });

  it('rejects a plan over the cap and reports the real count', () => {
    const changes = Array.from({ length: MAX_CHANGES + 14 }, () => ({ op: 'add' }));
    const result = parseReply(wire({ kind: 'plan', text: '', summary: 'lots', changes }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'badChangeCount', count: 34 } });
  });

  it('passes a change rejection straight back', () => {
    const refuse: ChangeParser<never> = () => ({ ok: false, reason: { kind: 'emptyTitle' } });
    const result = parseReply(wire({ kind: 'plan', text: '', summary: 's', changes: [{}] }), refuse);
    expect(result).toEqual({ ok: false, reason: { kind: 'emptyTitle' } });
  });
});
