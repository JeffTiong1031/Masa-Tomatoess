'use client';

import { useState, type FormEvent } from 'react';
import { Flag, Plus } from 'lucide-react';
import type { TodoDraft } from '@/lib/todo';
import type { UserName } from '@/lib/identity';

export default function TodoComposer({
  owner,
  onAdd,
}: {
  owner: UserName;
  onAdd: (draft: TodoDraft) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === '' || saving) return;

    setSaving(true);
    await onAdd({
      owner,
      title: trimmed,
      dueDate: dueDate === '' ? null : dueDate,
      dueTime: dueDate === '' || dueTime === '' ? null : dueTime,
      priority,
    });
    setTitle('');
    setPriority(false);
    setSaving(false);
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
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label="Due date"
          className="min-h-11 rounded-xl bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
        />

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
          aria-label="Important"
          className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl transition-colors ${
            priority
              ? 'bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)]'
              : 'text-[var(--mt-text-muted)]'
          }`}
        >
          <Flag size={18} strokeWidth={1.9} aria-hidden />
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
    </form>
  );
}
