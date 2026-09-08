'use client';

import { useState, type FormEvent } from 'react';
import { Flag, Plus, Calendar } from 'lucide-react';
import type { TodoDraft } from '@/lib/todo';
import type { UserName } from '@/lib/identity';
import { formatDateInputDisplay, revealDatePicker } from '@/lib/dateInputHint';

export default function TodoComposer({
  owner,
  onAdd,
}: {
  owner: UserName;
  onAdd: (draft: TodoDraft) => Promise<boolean>;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const dateLabel = formatDateInputDisplay(dueDate);
  const dateEmpty = dueDate === '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === '' || saving) return;

    setSaving(true);
    setFailed(false);
    const added = await onAdd({
      owner,
      title: trimmed,
      dueDate: dueDate === '' ? null : dueDate,
      dueTime: dueDate === '' || dueTime === '' ? null : dueTime,
      priority,
    });
    setSaving(false);
    if (!added) {
      setFailed(true);
      return;
    }
    setTitle('');
  };

  return (
    <form onSubmit={submit} className="mt-soft grid gap-3 p-4">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task"
        aria-label="Task"
        className="min-h-11 w-full rounded-xl bg-[var(--mt-surface)] px-3 text-[var(--mt-text)] placeholder:text-[var(--mt-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-h-11 min-w-[11rem]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center gap-2 rounded-xl bg-[var(--mt-surface)] px-3 text-sm"
          >
            <span
              className={
                dateEmpty
                  ? 'text-[var(--mt-text-muted)]'
                  : 'text-[var(--mt-text)]'
              }
            >
              {dateLabel}
            </span>
            <Calendar
              size={16}
              strokeWidth={1.9}
              className="ml-auto text-[var(--mt-text-muted)]"
            />
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            onClick={(event) => revealDatePicker(event.currentTarget)}
            aria-label="Due date"
            className="absolute inset-0 z-20 min-h-11 w-full cursor-pointer opacity-0"
          />
        </div>

        {dueDate === '' ? null : (
          <input
            type="time"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
            aria-label="Due time"
            className="min-h-11 rounded-xl bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />
        )}

        <button
          type="button"
          onClick={() => setPriority((current) => !current)}
          aria-pressed={priority}
          aria-label="Priority"
          className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl ${
            priority
              ? 'bg-[color-mix(in_srgb,var(--mt-accent)_28%,transparent)] text-[var(--mt-text)]'
              : 'text-[var(--mt-text-muted)]'
          }`}
        >
          <Flag
            size={18}
            strokeWidth={1.9}
            fill={priority ? 'currentColor' : 'none'}
            aria-hidden
          />
        </button>

        <button
          type="submit"
          disabled={title.trim() === '' || saving}
          className="ml-auto min-h-11 inline-flex items-center gap-2 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
        >
          <Plus size={18} strokeWidth={1.9} aria-hidden />
          Add
        </button>
      </div>

      {failed ? (
        <p className="text-xs text-[var(--mt-danger)]">
          That did not go through. Try again.
        </p>
      ) : null}
    </form>
  );
}
