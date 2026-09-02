import type { Message } from './assistantRequest';
import { MAX_MESSAGE_CHARS } from './assistantBody';
import type { PlannedChange } from './todoPlan';

export const MAX_FROM_YOU = 6;
export const WARN_AT_REMAINING = 2;

export type Entry =
  | { kind: 'text'; role: 'you' | 'assistant'; text: string }
  | { kind: 'plan'; summary: string; planned: PlannedChange[]; cancelled: boolean };

export interface CapStatus {
  remaining: number;
  full: boolean;
  warn: boolean;
}

export function countFromYou(entries: Entry[]): number {
  return entries.filter((entry) => entry.kind === 'text' && entry.role === 'you').length;
}

export function capStatus(fromYou: number): CapStatus {
  const remaining = MAX_FROM_YOU - fromYou;
  return {
    remaining,
    full: remaining <= 0,
    warn: remaining <= WARN_AT_REMAINING,
  };
}

export function historyFor(entries: Entry[]): Message[] {
  return entries.map((entry) => {
    if (entry.kind === 'text') return { role: entry.role, text: entry.text };

    if (entry.cancelled) return { role: 'assistant', text: `You cancelled: ${entry.summary}` };

    const saved = entry.planned.filter((p) => p.outcome === 'saved');
    if (saved.length > 0) {
      const handles = saved.map((p) => p.change.handle).filter((h) => h !== '');
      return { role: 'assistant', text: `Applied: ${entry.summary} (${handles.join(', ')})` };
    }

    const openText = `Open plan, not yet applied: ${entry.summary}\n${JSON.stringify(
      entry.planned.map((p) => p.change),
    )}`;
    if (openText.length <= MAX_MESSAGE_CHARS) {
      return { role: 'assistant', text: openText };
    }

    return {
      role: 'assistant',
      text: `Open plan, not yet applied: ${entry.summary}\nThis plan has ${entry.planned.length} changes and is still waiting.`,
    };
  });
}
