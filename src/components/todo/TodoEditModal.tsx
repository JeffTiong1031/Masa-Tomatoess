'use client';

import { useState } from 'react';
import { Flag, Trash2, Calendar } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Todo, TodoDraft } from '@/lib/todo';
import { formatDateInputDisplay, revealDatePicker } from '@/lib/dateInputHint';

export default function TodoEditModal({
  todo,
  onClose,
  onSave,
  onDelete,
}: {
  todo: Todo;
  onClose: () => void;
  onSave: (id: string, draft: TodoDraft) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '');
  const [dueTime, setDueTime] = useState(todo.dueTime ?? '');
  const [priority, setPriority] = useState(todo.priority);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const dateLabel = formatDateInputDisplay(dueDate);
  const dateEmpty = dueDate === '';

  const save = async () => {
    const trimmed = title.trim();
    if (trimmed === '' || busy) return;
    setBusy(true);
    setFailed(false);
    const saved = await onSave(todo.id, {
      owner: todo.owner,
      title: trimmed,
      dueDate: dueDate === '' ? null : dueDate,
      dueTime: dueDate === '' || dueTime === '' ? null : dueTime,
      priority,
    });
    setBusy(false);
    if (!saved) {
      setFailed(true);
      return;
    }
    onClose();
  };

  const remove = async () => {
    setBusy(true);
    setFailed(false);
    const removed = await onDelete(todo.id);
    setBusy(false);
    if (!removed) {
      setFailed(true);
      return;
    }
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
          <div className="relative min-h-11 min-w-[11rem]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex items-center gap-2 rounded-xl bg-[var(--mt-bg)] px-3 text-sm"
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
              className="min-h-11 rounded-xl bg-[var(--mt-bg)] px-3 text-sm text-[var(--mt-text)]"
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
        </div>
        {failed ? (
          <p className="text-xs text-[var(--mt-danger)]">
            That did not go through. Try again.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
