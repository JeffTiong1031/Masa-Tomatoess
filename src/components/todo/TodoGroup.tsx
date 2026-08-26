'use client';

import TodoRow from './TodoRow';
import type { Todo } from '@/lib/todo';

export default function TodoGroup({
  group,
  onToggle,
  onOpen,
}: {
  group: { name: string; todos: Todo[] };
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
}) {
  return (
    <section className="mt-soft p-4">
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-[var(--mt-text)]">
        {group.name}
        <span className="text-xs font-normal text-[var(--mt-text-muted)]">
          {group.todos.length}
        </span>
      </h2>
      <ul className="grid gap-1">
        {group.todos.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            overdue={group.name === 'Overdue'}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}
