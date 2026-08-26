'use client';

import { Check, Flag } from 'lucide-react';
import { formatLongDate } from '@/lib/dates';
import type { Todo } from '@/lib/todo';

export default function TodoRow({
  todo,
  overdue,
  onToggle,
  onOpen,
}: {
  todo: Todo;
  overdue: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
}) {
  return (
    <li className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onToggle(todo)}
        aria-label={todo.done ? `Reopen ${todo.title}` : `Finish ${todo.title}`}
        className="min-h-11 min-w-11 inline-flex items-center justify-center"
      >
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            todo.done
              ? 'border-[var(--mt-accent)] bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)]'
              : 'border-[var(--mt-border)]'
          }`}
        >
          {todo.done ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpen(todo)}
        className="min-h-11 flex-1 text-left"
      >
        <span
          className={`block text-sm ${
            todo.done
              ? 'text-[var(--mt-text-muted)] line-through'
              : 'text-[var(--mt-text)]'
          }`}
        >
          {todo.title}
        </span>
        {todo.dueDate === null ? null : (
          <span
            className={`block text-xs ${
              overdue ? 'text-[var(--mt-danger)]' : 'text-[var(--mt-text-muted)]'
            }`}
          >
            {formatLongDate(todo.dueDate)}
            {todo.dueTime === null ? '' : ` · ${todo.dueTime}`}
          </span>
        )}
      </button>

      {todo.priority ? (
        <Flag
          size={16}
          strokeWidth={2}
          role="img"
          aria-label="Important"
          className="text-[var(--mt-accent)]"
        />
      ) : null}
    </li>
  );
}
