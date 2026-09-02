'use client';

import { AlertTriangle, Check, X } from 'lucide-react';
import { buttonStateFor, isRetryable } from '@/lib/assistantRun';
import { clashesFor, type PlannedChange, type TodoChange } from '@/lib/todoPlan';
import type { Todo } from '@/lib/todo';

const OP_WORDS: Record<TodoChange['op'], string> = {
  add: 'Add',
  edit: 'Change',
  complete: 'Tick off',
  reopen: 'Reopen',
  delete: 'Delete',
};

function describe(change: TodoChange): string {
  const parts = [change.title];
  if (change.dueDate !== '') parts.push(change.dueDate);
  if (change.dueTime !== '') parts.push(change.dueTime);
  if (change.priority) parts.push('priority');
  return parts.join(' · ');
}

export default function PlanCard({
  summary,
  planned,
  rows,
  running,
  onApply,
  onCancel,
  cancelled,
}: {
  summary: string;
  planned: PlannedChange[];
  rows: Todo[];
  running: boolean;
  onApply: () => void;
  onCancel: () => void;
  cancelled: boolean;
}) {
  const state = buttonStateFor(planned.map((entry) => entry.outcome), running);
  const saved = planned.filter((entry) => entry.outcome === 'saved').length;
  const retryCount = planned.filter((entry) => isRetryable(entry.outcome)).length;

  return (
    <div className="mt-soft border border-[var(--mt-border)] p-4">
      <p className="text-sm font-medium text-[var(--mt-text)]">{summary}</p>

      <ul className="mt-3 space-y-2">
        {planned.map((entry, index) => {
          const clashes = clashesFor(entry.change, rows, entry.id);
          return (
            <li key={index} className="text-sm text-[var(--mt-text)]">
              <span className="font-medium">{OP_WORDS[entry.change.op]}</span>{' '}
              {describe(entry.change)}
              {entry.outcome === 'saved' && (
                <Check size={14} className="ml-1 inline text-[var(--mt-text-muted)]" aria-label="saved" />
              )}
              {entry.note !== '' && (
                <span className="ml-1 text-[var(--mt-text-muted)]">— {entry.note}</span>
              )}
              {clashes.length > 0 && entry.outcome !== 'saved' && entry.outcome !== 'stale' && (
                <span className="mt-1 flex items-center gap-1 text-[var(--mt-text-muted)]">
                  <AlertTriangle size={14} aria-hidden />
                  You already have &ldquo;{clashes[0].title}&rdquo; that day.
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {cancelled && <p className="mt-3 text-sm text-[var(--mt-text-muted)]">Cancelled.</p>}

      {state === 'done' && (
        <p className="mt-3 text-sm text-[var(--mt-text-muted)]">
          Saved. {saved} of {planned.length}.
        </p>
      )}

      {!cancelled && state !== 'done' && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={running}
            className="min-h-11 flex-1 rounded-full bg-[var(--mt-accent)] px-4 text-sm font-medium text-[var(--mt-text)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
          >
            {running ? 'Saving…' : state === 'retry' ? `Try the other ${retryCount} again` : 'Apply'}
          </button>
          {state === 'idle' && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="min-h-11 min-w-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
