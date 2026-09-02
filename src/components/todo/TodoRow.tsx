'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check } from 'lucide-react';
import { formatLongDate } from '@/lib/dates';
import type { Todo } from '@/lib/todo';

export default function TodoRow({
  todo,
  overdue,
  onToggle,
  onOpen,
  sortable = false,
}: {
  todo: Todo;
  overdue: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  sortable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !sortable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex touch-manipulation items-center gap-3 ${
        isDragging
          ? 'relative z-10 rounded-xl bg-[var(--mt-surface)] shadow-[var(--mt-shadow-soft)]'
          : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(todo)}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={todo.done ? `Reopen ${todo.title}` : `Finish ${todo.title}`}
        className="min-h-11 min-w-11 inline-flex shrink-0 items-center justify-center"
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

      {sortable ? (
        <div
          className="min-h-11 flex-1 cursor-grab text-left active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={() => onOpen(todo)}
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
        </div>
      ) : (
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
      )}
    </li>
  );
}
