'use client';

import { useState } from 'react';
import { Flag, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Todo, TodoDraft } from '@/lib/todo';

export default function TodoEditModal({
  todo,
  onClose,
  onSave,
  onDelete,
}: {
  todo: Todo;
  onClose: () => void;
  onSave: (id: string, draft: TodoDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '');
  const [dueTime, setDueTime] = useState(todo.dueTime ?? '');
  const [priority, setPriority] = useState(todo.priority);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = title.trim();
    if (trimmed === '' || busy) return;
    setBusy(true);
    await onSave(todo.id, {
      owner: todo.owner,
      title: trimmed,
      dueDate: dueDate === '' ? null : dueDate,
      dueTime: dueDate === '' || dueTime === '' ? null : dueTime,
      priority,
    });
    setBusy(false);
    onClose();
  };

  const remove = async () => {
    setBusy(true);
    await onDelete(todo.id);
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit task"
      variant="sheet"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-[var(--mt-danger)] disabled:opacity-50"
            aria-label="Delete task"
          >
            <Trash2 size={18} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || title.trim() === ''}
            className="ml-auto min-h-11 rounded-xl bg-[var(--mt-accent)] px-5 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
          >
            Save
          </button>
        </div>
      }
    >
      <div className="grid gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Task"
          className="min-h-11 w-full rounded-xl bg-[var(--mt-bg)] px-3 text-[var(--mt-text)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Due date"
            className="min-h-11 rounded-xl bg-[var(--mt-bg)] px-3 text-sm text-[var(--mt-text)]"
          />
          {dueDate === '' ? null : (
            <input
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              aria-label="Due time"
              className="min-h-11 rounded-xl bg-[var(--mt-bg)] px-3 text-sm text-[var(--mt-text)]"
            />
          )}
          <button
            type="button"
            onClick={() => setPriority((current) => !current)}
            aria-pressed={priority}
            aria-label="Important"
            className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl ${
              priority
                ? 'bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)]'
                : 'text-[var(--mt-text-muted)]'
            }`}
          >
            <Flag size={18} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      </div>
    </Modal>
  );
}
