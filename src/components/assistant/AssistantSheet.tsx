'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import PlanCard from './PlanCard';
import { assistantFailureMessage } from '@/lib/assistantFailure';
import { MAX_MESSAGE_CHARS } from '@/lib/assistantBody';
import { buildTodoSnapshot, emptyHandleMap, type HandleMap } from '@/lib/assistantContext';
import {
  capStatus,
  countFromYou,
  historyFor,
  type Entry,
} from '@/lib/assistantConversation';
import { parseReply } from '@/lib/assistantReply';
import { askTodoAssistant } from '@/lib/assistantRequest';
import { applySummary, runPlan, type ApplyTone } from '@/lib/applyRun';
import type { StepOutcome } from '@/lib/assistantRun';
import {
  clashesFor,
  reconcileTodoPlan,
  todoChangeParser,
  toDraft,
  validateTodoPlan,
  type PlannedChange,
  type TodoChange,
} from '@/lib/todoPlan';
import {
  deleteTodo,
  fetchTodos,
  insertTodo,
  setTodoDone,
  updateTodo,
} from '@/lib/todoRepo';
import type { Todo } from '@/lib/todo';
import type { UserName } from '@/lib/identity';

const STEP_BUDGET_MS = 10_000;

async function runChange(entry: PlannedChange, owner: UserName): Promise<StepOutcome> {
  let timer!: number;
  const budget = new Promise<'unreached'>((resolve) => {
    timer = window.setTimeout(() => resolve('unreached'), STEP_BUDGET_MS);
  });

  const work = (async (): Promise<StepOutcome> => {
    const { change, id } = entry;
    if (change.op === 'add') {
      return (await insertTodo(toDraft(change, owner))) === null ? 'failed' : 'saved';
    }
    if (change.op === 'edit') {
      return (await updateTodo(id as string, toDraft(change, owner))) ? 'saved' : 'failed';
    }
    if (change.op === 'delete') {
      return (await deleteTodo(id as string)) ? 'saved' : 'failed';
    }
    return (await setTodoDone(id as string, change.op === 'complete')) ? 'saved' : 'failed';
  })();

  const outcome = await Promise.race([work, budget]);
  window.clearTimeout(timer);
  return outcome;
}

export default function AssistantSheet({
  open,
  onClose,
  owner,
  rows,
  today,
  now,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  owner: UserName;
  rows: Todo[];
  today: string;
  now: string;
  onApplied: (message: string, tone: ApplyTone) => void;
}) {
  const [entries, setEntries] = useState<Entry<TodoChange>[]>([]);
  const [map, setMap] = useState<HandleMap>(() => emptyHandleMap('t'));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [running, setRunning] = useState(false);

  const { remaining, full, warn } = capStatus(countFromYou(entries));

  function reset() {
    setEntries([]);
    setMap(emptyHandleMap('t'));
    setDraft('');
  }

  async function send() {
    const text = draft.trim();
    if (text === '' || full || thinking) return;

    const asked: Entry<TodoChange>[] = [...entries, { kind: 'text', role: 'you', text }];
    setEntries(asked);
    setDraft('');
    setThinking(true);

    const { snapshot, map: nextMap } = buildTodoSnapshot(rows, map, today, now);
    setMap(nextMap);

    const result = await askTodoAssistant(snapshot, historyFor(asked));
    setThinking(false);

    if (!result.ok) {
      const text = assistantFailureMessage(result.reason);
      setEntries((prev) => [...prev, { kind: 'text', role: 'assistant', text }]);
      return;
    }

    const parsed = parseReply<TodoChange>(result.value, todoChangeParser(nextMap, today));
    if (!parsed.ok) {
      const text = assistantFailureMessage(parsed.reason);
      setEntries((prev) => [...prev, { kind: 'text', role: 'assistant', text }]);
      return;
    }

    if (parsed.reply.kind !== 'plan') {
      const text = parsed.reply.text;
      setEntries((prev) => [...prev, { kind: 'text', role: 'assistant', text }]);
      return;
    }

    const duplicate = validateTodoPlan(parsed.reply.changes);
    if (duplicate !== null) {
      const text = assistantFailureMessage(duplicate);
      setEntries((prev) => [...prev, { kind: 'text', role: 'assistant', text }]);
      return;
    }

    const plan: Entry<TodoChange> = {
      kind: 'plan',
      summary: parsed.reply.summary,
      planned: reconcileTodoPlan(parsed.reply.changes, nextMap, rows),
      cancelled: false,
    };
    setEntries((prev) => [...prev, plan]);
  }

  async function apply(index: number) {
    setRunning(true);
    try {
      const fresh = await fetchTodos(owner);
      if (fresh.status !== 'ok') {
        onApplied('Could not reach your list. Nothing was changed.', 'problem');
        return;
      }

      const entry = entries[index] as Extract<Entry<TodoChange>, { kind: 'plan' }>;
      const results = await runPlan<TodoChange>(
        entry.planned,
        (change) => reconcileTodoPlan([change], map, fresh.rows)[0],
        (step) => clashesFor(step.change, fresh.rows, step.id).map((row) => row.title),
        (change) => runChange(change, owner),
        Date.now,
      );

      setEntries((prev) =>
        prev.map((e, i) => (i === index && e.kind === 'plan' ? { ...e, planned: results } : e)),
      );

      const { message, tone } = applySummary(results);
      onApplied(message, tone);
    } finally {
      setRunning(false);
    }
  }

  function cancel(index: number) {
    setEntries(
      entries.map((entry, i) =>
        i === index && entry.kind === 'plan' ? { ...entry, cancelled: true } : entry,
      ),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Ask about your list" variant="sheet" maxWidthClass="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3" aria-live="polite">
          {entries.map((entry, index) =>
            entry.kind === 'text' ? (
              <p
                key={index}
                className={
                  entry.role === 'you'
                    ? 'self-end rounded-2xl bg-[color-mix(in_srgb,var(--mt-accent)_28%,transparent)] px-3 py-2 text-sm text-[var(--mt-text)]'
                    : 'text-sm text-[var(--mt-text)]'
                }
              >
                {entry.text}
              </p>
            ) : (
              <PlanCard
                key={index}
                summary={entry.summary}
                planned={entry.planned}
                rows={rows}
                running={running}
                cancelled={entry.cancelled}
                onApply={() => apply(index)}
                onCancel={() => cancel(index)}
              />
            ),
          )}

          {thinking && <p className="text-sm text-[var(--mt-text-muted)]">Thinking…</p>}
        </div>

        {full ? (
          <div className="mt-soft p-4">
            <p className="text-sm font-medium text-[var(--mt-text)]">This chat is full.</p>
            <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
              Six messages is the limit, so replies stay fast and cheap. Start a new one — it will
              still see all your current tasks.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 min-h-11 w-full rounded-full bg-[var(--mt-accent)] px-4 text-sm font-medium text-[var(--mt-text)]"
            >
              Start new chat
            </button>
          </div>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Move dentist to Friday"
                aria-label="Message"
                maxLength={MAX_MESSAGE_CHARS}
                className="min-h-11 flex-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm text-[var(--mt-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
              />
              <button
                type="submit"
                disabled={thinking}
                className="min-h-11 min-w-11 rounded-full bg-[var(--mt-accent)] px-4 text-sm font-medium text-[var(--mt-text)] disabled:opacity-60"
              >
                Send
              </button>
            </form>
            {warn && (
              <p className="text-xs text-[var(--mt-text-muted)]">
                {remaining} messages left in this chat.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
