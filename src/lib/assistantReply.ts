export const MAX_CHANGES = 20;

export type Reason =
  | { kind: 'unknownKind' }
  | { kind: 'shapeMismatch' }
  | { kind: 'badChangeCount'; count: number }
  | { kind: 'unknownHandle'; handle: string }
  | { kind: 'emptyTitle' }
  | { kind: 'badDate'; value: string }
  | { kind: 'badTime'; value: string }
  | { kind: 'yearOutOfRange'; year: number }
  | { kind: 'unknownCategory'; name: string }
  | { kind: 'duplicateHandle'; handle: string }
  | { kind: 'formRejection'; message: string }
  | { kind: 'unconfigured' }
  | { kind: 'quota' }
  | { kind: 'offline' }
  | { kind: 'timeout' }
  | { kind: 'serverError' };

export type TextKind = 'answer' | 'question' | 'refusal';

export interface TextReply {
  kind: TextKind;
  text: string;
}

export interface PlanReply<C> {
  kind: 'plan';
  summary: string;
  changes: C[];
}

export type AssistantReply<C> = TextReply | PlanReply<C>;

export type ChangeParser<C> = (
  raw: unknown,
) => { ok: true; change: C } | { ok: false; reason: Reason };

export type Parsed<C> =
  | { ok: true; reply: AssistantReply<C> }
  | { ok: false; reason: Reason };

const TEXT_KINDS: TextKind[] = ['answer', 'question', 'refusal'];

interface Wire {
  kind: string;
  text: string;
  summary: string;
  changes: unknown[];
}

function toWire(value: unknown): Wire | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.kind !== 'string') return null;
  if (typeof raw.text !== 'string') return null;
  if (typeof raw.summary !== 'string') return null;
  if (!Array.isArray(raw.changes)) return null;
  return { kind: raw.kind, text: raw.text, summary: raw.summary, changes: raw.changes };
}

export function parseReply<C>(value: unknown, parseChange: ChangeParser<C>): Parsed<C> {
  const wire = toWire(value);
  if (wire === null) return { ok: false, reason: { kind: 'unknownKind' } };

  if (TEXT_KINDS.includes(wire.kind as TextKind)) {
    if (wire.changes.length > 0 || wire.summary !== '') {
      return { ok: false, reason: { kind: 'shapeMismatch' } };
    }
    return { ok: true, reply: { kind: wire.kind as TextKind, text: wire.text } };
  }

  if (wire.kind !== 'plan') return { ok: false, reason: { kind: 'unknownKind' } };

  if (wire.text !== '') return { ok: false, reason: { kind: 'shapeMismatch' } };

  if (wire.changes.length === 0 || wire.changes.length > MAX_CHANGES) {
    return { ok: false, reason: { kind: 'badChangeCount', count: wire.changes.length } };
  }

  const changes: C[] = [];
  for (const raw of wire.changes) {
    const parsed = parseChange(raw);
    if (!parsed.ok) return parsed;
    changes.push(parsed.change);
  }

  return { ok: true, reply: { kind: 'plan', summary: wire.summary, changes } };
}
