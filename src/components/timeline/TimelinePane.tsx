import { Fragment, type ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { TimelineEntry } from '@/lib/timeline';

export type PaneState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: TimelineEntry[] };

export default function TimelinePane({
  name,
  isMine,
  state,
  onRetry,
  action,
  body,
}: {
  name: string;
  isMine: boolean;
  state: PaneState;
  onRetry: () => void;
  action?: ReactNode;
  body?: ReactNode;
}) {
  return (
    <Card className="mb-4">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--mt-text)]">
          {name}
          {isMine && (
            <span className="ml-2 text-xs font-normal text-[var(--mt-text-subtle)]">
              You
            </span>
          )}
        </h2>
        {action}
      </div>
      {body ?? <PaneBody state={state} name={name} onRetry={onRetry} />}
    </Card>
  );
}

function PaneBody({
  state,
  name,
  onRetry,
}: {
  state: PaneState;
  name: string;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <span className="sr-only">Loading {name}&apos;s timetable</span>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-5 rounded-md bg-[color-mix(in_srgb,var(--mt-text)_8%,transparent)]"
          />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--mt-danger)]" role="alert">
          Couldn&apos;t load {name}&apos;s timetable.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.entries.length === 0) {
    return (
      <p className="text-sm text-[var(--mt-text-muted)]">Nothing planned yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      {state.entries.map((entry, index) => (
        <Fragment key={index}>
          <div className="text-xs text-[var(--mt-text-muted)]">
            {entry.time || '—'}
          </div>
          <div className="text-sm text-[var(--mt-text)]">{entry.activity}</div>
        </Fragment>
      ))}
    </div>
  );
}
