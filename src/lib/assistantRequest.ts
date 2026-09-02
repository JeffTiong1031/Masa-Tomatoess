import { reasonForStatus } from './assistantFailure';
import type { Reason } from './assistantReply';
import type { CalendarSnapshot, TodoSnapshot } from './assistantContext';
import type { Message } from './assistantBody';

export type { Message };

export const MESSAGE_BUDGET_MS = 20_000;

export type ReplyResult = { ok: true; value: unknown } | { ok: false; reason: Reason };

async function ask(
  path: string,
  body: { snapshot: unknown; history: Message[] },
): Promise<ReplyResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), MESSAGE_BUDGET_MS);

  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: reasonForStatus(response.status) };
    }

    return { ok: true, value: await response.json() };
  } catch (err) {
    console.error('Assistant request failed:', err);
    if (controller.signal.aborted) return { ok: false, reason: { kind: 'timeout' } };
    return { ok: false, reason: { kind: 'offline' } };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function askCalendarAssistant(
  snapshot: CalendarSnapshot,
  history: Message[],
): Promise<ReplyResult> {
  return ask('/api/assistant/calendar', { snapshot, history });
}

export async function askTodoAssistant(
  snapshot: TodoSnapshot,
  history: Message[],
): Promise<ReplyResult> {
  return ask('/api/assistant/todo', { snapshot, history });
}
