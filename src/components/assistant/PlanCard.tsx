'use client';

import { AlertTriangle, Check, X } from 'lucide-react';
import { buttonStateFor, isRetryable, type Planned } from '@/lib/assistantRun';
import type { AssistantSection } from './section';

export default function PlanCard<C extends { handle: string }, R>({
  section,
  summary,
  planned,
  rows,
  running,
  onApply,
  onCancel,
  cancelled,
}: {
  section: AssistantSection<C, R>;
  summary: string;
  planned: Planned<C>[];
  rows: R[];
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
          const clashes = section.clashTitles(entry, rows);
          const outside = section.outsideNote(entry.change);
          const pending = entry.outcome !== 'saved' && entry.outcome !== 'stale';
          return (
            <li key={index} className="text-sm text-[var(--mt-text)]">
              <span className="font-medium">{section.opWord(entry.change)}</span>{' '}
              {section.describe(entry.change)}
              {entry.outcome === 'saved' && (
                <Check size={14} className="ml-1 inline text-[var(--mt-text-muted)]" aria-label="saved" />
              )}
              {entry.note !== '' && (
                <span className="ml-1 text-[var(--mt-text-muted)]">— {entry.note}</span>
              )}
              {outside !== '' && (
                <span className="ml-1 text-[var(--mt-text-muted)]">— {outside}</span>
              )}
              {clashes.length > 0 && pending && (
                <span className="mt-1 flex items-center gap-1 text-[var(--mt-text-muted)]">
                  <AlertTriangle size={14} aria-hidden />
                  {section.clashNote(clashes[0])}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {cancelled && <p className="mt-3 text-sm text-[var(--mt-text-muted)]">Cancelled.</p>}

      {state === 'done' && (
        <p className="mt-3 text-sm text-[var(--mt-text-muted)]">
          {saved === 0 ? 'Nothing saved.' : `Saved. ${saved} of ${planned.length}.`}
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
