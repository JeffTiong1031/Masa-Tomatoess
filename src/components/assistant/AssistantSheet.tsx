'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import PlanCard from './PlanCard';
import { assistantFailureMessage } from '@/lib/assistantFailure';
import { MAX_MESSAGE_CHARS } from '@/lib/assistantBody';
import { emptyHandleMap, type HandleMap } from '@/lib/assistantContext';
import { capStatus, countFromYou, historyFor, type Entry } from '@/lib/assistantConversation';
import { parseReply } from '@/lib/assistantReply';
import { applySummary, runPlan, type ApplyTone } from '@/lib/applyRun';
import type { UserName } from '@/lib/identity';
import type { AssistantClock, AssistantSection } from './section';

export default function AssistantSheet<C extends { handle: string }, R>({
  open,
  onClose,
  section,
  owner,
  rows,
  clock,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  section: AssistantSection<C, R>;
  owner: UserName;
  rows: R[];
  clock: () => AssistantClock;
  onApplied: (message: string, tone: ApplyTone) => void;
}) {
  const [entries, setEntries] = useState<Entry<C>[]>([]);
  const [map, setMap] = useState<HandleMap>(() => emptyHandleMap(section.prefix));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [running, setRunning] = useState(false);

  const { remaining, full, warn } = capStatus(countFromYou(entries));

  function reset() {
    setEntries([]);
    setMap(emptyHandleMap(section.prefix));
    setDraft('');
  }

  function say(text: string) {
    setEntries((prev) => [...prev, { kind: 'text', role: 'assistant', text }]);
  }

  async function send() {
    const text = draft.trim();
    if (text === '' || full || thinking) return;

    const asked: Entry<C>[] = [...entries, { kind: 'text', role: 'you', text }];
    setEntries(asked);
    setDraft('');
    setThinking(true);

    const { today, now } = clock();
    const { map: nextMap, result } = await section.ask({
      rows,
      map,
      today,
      now,
      history: historyFor(asked),
      owner,
    });
    setMap(nextMap);
    setThinking(false);

    if (!result.ok) {
      say(assistantFailureMessage(result.reason));
      return;
    }

    const parsed = parseReply<C>(result.value, section.parser(nextMap, today));
    if (!parsed.ok) {
      say(assistantFailureMessage(parsed.reason));
      return;
    }

    if (parsed.reply.kind !== 'plan') {
      say(parsed.reply.text);
      return;
    }

    const duplicate = section.validatePlan(parsed.reply.changes);
    if (duplicate !== null) {
      say(assistantFailureMessage(duplicate));
      return;
    }

    const plan = parsed.reply;
    setEntries((prev) => [
      ...prev,
      {
        kind: 'plan',
        summary: plan.summary,
        planned: section.reconcile(plan.changes, nextMap, rows),
        cancelled: false,
      },
    ]);
  }

  async function apply(index: number) {
    setRunning(true);
    try {
      const fresh = await section.fetchFresh(owner);
      if (fresh === null) {
        onApplied(section.fetchFailure, 'problem');
        return;
      }

      const entry = entries[index] as Extract<Entry<C>, { kind: 'plan' }>;
      const results = await runPlan<C>(
        entry.planned,
        (change) => section.reconcile([change], map, fresh)[0],
        (step) => section.clashTitles(step, fresh),
        (step) => section.runChange(step, owner),
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
    <Modal open={open} onClose={onClose} title={section.title} variant="sheet" maxWidthClass="max-w-lg">
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
                section={section}
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
              still see everything on your board.
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
                placeholder={section.placeholder}
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
