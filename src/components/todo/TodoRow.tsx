'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Flag } from 'lucide-react';
import { formatLongDate } from '@/lib/dates';
import type { Todo } from '@/lib/todo';

export default function TodoRow({
  todo,
  overdue,
  onToggle,
  onOpen,
  onPriority,
  sortable = false,
}: {
  todo: Todo;
  overdue: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority?: (todo: Todo) => void;
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

  const body = (
    <>
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
    </>
  );

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
          {body}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(todo)}
          className="min-h-11 flex-1 text-left"
        >
          {body}
        </button>
      )}

      {onPriority && !todo.done ? (
        <button
          type="button"
          onClick={() => onPriority(todo)}
          onPointerDown={(event) => event.stopPropagation()}
          aria-pressed={todo.priority}
          aria-label={todo.priority ? `Unflag ${todo.title}` : `Flag ${todo.title}`}
          className={`min-h-11 min-w-11 inline-flex shrink-0 items-center justify-center ${
            todo.priority ? 'text-[var(--mt-text)]' : 'text-[var(--mt-text-muted)]'
          }`}
        >
          <Flag
            size={16}
            strokeWidth={1.9}
            fill={todo.priority ? 'currentColor' : 'none'}
            aria-hidden
          />
        </button>
      ) : todo.priority ? (
        <span className="min-h-11 min-w-11 inline-flex shrink-0 items-center justify-center text-[var(--mt-text-muted)]">
          <Flag size={16} strokeWidth={1.9} fill="currentColor" aria-hidden />
        </span>
      ) : null}
    </li>
  );
}
