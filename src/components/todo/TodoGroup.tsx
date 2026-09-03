'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TodoRow from './TodoRow';
import { Trash2 } from 'lucide-react';
import type { Todo } from '@/lib/todo';

export default function TodoGroup({
  group,
  onToggle,
  onOpen,
  onPriority,
  onDeleteCompleted,
  sortable = true,
}: {
  group: { name: string; todos: Todo[] };
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority?: (todo: Todo) => void;
  onDeleteCompleted?: () => void;
  sortable?: boolean;
}) {
  const ids = group.todos.map((todo) => todo.id);

  return (
    <section className="mt-soft p-4">
      <h2 className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-[var(--mt-text)]">
        <span className="flex items-baseline gap-2">
          {group.name}
          <span className="text-xs font-normal text-[var(--mt-text-muted)]">
            {group.todos.length}
          </span>
        </span>
        {onDeleteCompleted ? (
          <button
            type="button"
            onClick={onDeleteCompleted}
            className="min-h-11 rounded-xl px-3 text-[var(--mt-danger)]"
            aria-label="Delete all completed tasks"
          >
            <Trash2 size={18} strokeWidth={1.9} aria-hidden />
          </button>
        ) : null}
      </h2>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="grid gap-1">
          {group.todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              overdue={group.name === 'Overdue'}
              onToggle={onToggle}
              onOpen={onOpen}
              onPriority={onPriority}
              sortable={sortable}
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}
