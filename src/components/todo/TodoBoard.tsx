'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { todayISO, timeISO } from '@/lib/dates';
import { isUserName, USERS, type UserName } from '@/lib/identity';
import {
  deleteCompletedTodos,
  deleteTodo,
  fetchTodos,
  insertTodo,
  reorderTodos,
  setTodoDone,
  updateTodo,
} from '@/lib/todoRepo';
import {
  completedTodos,
  groupTodos,
  nextWakeDelayMs,
  clampReorderInGroup,
  placeInPriorityFence,
  sortOrdersForOrder,
} from '@/lib/todoList';
import type { Todo, TodoDraft } from '@/lib/todo';
import { useHasMounted } from '@/hooks/useHasMounted';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import TodoComposer from '@/components/todo/TodoComposer';
import TodoGroup from '@/components/todo/TodoGroup';
import TodoEditModal from '@/components/todo/TodoEditModal';
import AssistantButton from '@/components/assistant/AssistantButton';
import { todoSection } from '@/components/assistant/todoSection';

type BoardStatus = 'loading' | 'ok' | 'missing-table' | 'error';

type NoticeTone = 'ok' | 'problem';

interface Notice {
  text: string;
  tone: NoticeTone;
}

interface Clock {
  today: string;
  now: string;
}

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

function readStoredUser(): string | null {
  return localStorage.getItem('user_name');
}

export default function TodoBoard() {
  const mounted = useHasMounted();
  const storedUser = useSyncExternalStore(subscribeStorage, readStoredUser, () => null);
  const signedIn: UserName = isUserName(storedUser) ? storedUser : 'Jeff';
  const [chosenView, setChosenView] = useState<UserName | null>(null);
  const viewing: UserName = chosenView ?? signedIn;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<BoardStatus>('loading');
  const [loadedFor, setLoadedFor] = useState<UserName | null>(null);
  const [clock, setClock] = useState<Clock>(() => ({ today: todayISO(), now: timeISO() }));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingCompleted, setDeletingCompleted] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [shownFor, setShownFor] = useState<UserName>(viewing);
  const [reloadToken, setReloadToken] = useState(0);

  if (viewing !== shownFor) {
    setShownFor(viewing);
    setShowCompleted(false);
  }

  const displayStatus: BoardStatus = viewing === loadedFor ? status : 'loading';
  const visible = displayStatus === 'ok' ? todos : [];
  const groups = groupTodos(visible, clock.today, clock.now);
  const finished = completedTodos(visible, clock.today);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  useEffect(() => {
    let cancelled = false;
    const owner = viewing;
    fetchTodos(owner).then((result) => {
      if (cancelled) return;
      if (result.status === 'ok') {
        setTodos(result.rows);
        setStatus('ok');
        setLoadedFor(owner);
        return;
      }
      setTodos([]);
      setStatus(result.status);
      setLoadedFor(owner);
    });
    return () => {
      cancelled = true;
    };
  }, [viewing, reloadToken]);

  useEffect(() => {
    const delay = nextWakeDelayMs(todos, clock.today, clock.now, new Date());
    const timer = window.setTimeout(() => {
      setClock({ today: todayISO(), now: timeISO() });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [todos, clock]);

  const handleAdd = useCallback(async (draft: TodoDraft) => {
    const created = await insertTodo(draft);
    if (created === null) {
      setNotice({ text: 'That task did not save. Try again.', tone: 'problem' });
      return false;
    }

    if (draft.priority && viewing === draft.owner) {
      const withCreated = [...todos, created];
      const target = groupTodos(withCreated, clock.today, clock.now).find((group) =>
        group.todos.some((todo) => todo.id === created.id),
      );
      if (target !== undefined) {
        const orderedIds = placeInPriorityFence(target.todos, created.id, true);
        await reorderTodos(sortOrdersForOrder(orderedIds));
      }
    }

    setNotice(null);
    setChosenView(draft.owner);
    setReloadToken((token) => token + 1);
    return true;
  }, [todos, clock, viewing]);

  const handleToggle = useCallback(async (todo: Todo) => {
    const next = !todo.done;
    const at = new Date().toISOString();
    setTodos((current) =>
      current.map((row) =>
        row.id === todo.id
          ? next
            ? { ...row, done: true, completedAt: at }
            : { ...row, done: false, completedAt: null }
          : row,
      ),
    );
    setNotice(null);

    const saved = await setTodoDone(todo.id, next);
    if (saved) return;

    setTodos((current) => current.map((row) => (row.id === todo.id ? todo : row)));
    setNotice({ text: 'That change did not save.', tone: 'problem' });
  }, []);

  const applyFenceOrder = useCallback(
    async (
      list: Todo[],
      id: string,
      priority: boolean,
    ): Promise<{ list: Todo[]; saved: boolean }> => {
      const target = groupTodos(list, clock.today, clock.now).find((group) =>
        group.todos.some((todo) => todo.id === id),
      );
      if (target === undefined) return { list, saved: true };

      const orderedIds = placeInPriorityFence(target.todos, id, priority);
      const updates = sortOrdersForOrder(orderedIds);
      const byId = new Map(updates.map((update) => [update.id, update.sortOrder]));
      const nextList = list.map((todo) =>
        byId.has(todo.id) ? { ...todo, sortOrder: byId.get(todo.id) as number } : todo,
      );
      const saved = await reorderTodos(updates);
      return { list: nextList, saved };
    },
    [clock],
  );

  const handlePriority = useCallback(
    async (todo: Todo) => {
      if (todo.done) return;
      const nextPriority = !todo.priority;
      const previous = todos;
      const drafted: TodoDraft = {
        owner: todo.owner,
        title: todo.title,
        dueDate: todo.dueDate,
        dueTime: todo.dueTime,
        priority: nextPriority,
      };
      const withFlag = todos.map((row) =>
        row.id === todo.id ? { ...row, priority: nextPriority } : row,
      );

      setTodos(withFlag);
      setNotice(null);

      const savedFields = await updateTodo(todo.id, drafted);
      if (!savedFields) {
        setTodos(previous);
        setNotice({ text: 'That change did not save.', tone: 'problem' });
        return;
      }

      const fenced = await applyFenceOrder(withFlag, todo.id, nextPriority);
      if (!fenced.saved) {
        setReloadToken((token) => token + 1);
        setNotice({ text: 'That order did not save.', tone: 'problem' });
        return;
      }
      setTodos(fenced.list);
    },
    [todos, applyFenceOrder],
  );

  const handleSave = useCallback(
    async (id: string, draft: TodoDraft) => {
      const existing = todos.find((todo) => todo.id === id);
      if (existing === undefined) return false;

      const priorityChanged = existing.priority !== draft.priority;
      const dueChanged =
        existing.dueDate !== draft.dueDate || existing.dueTime !== draft.dueTime;
      const needsFence = priorityChanged || (draft.priority && dueChanged);

      const saved = await updateTodo(id, draft);
      if (!saved) {
        setNotice({ text: 'That edit did not save.', tone: 'problem' });
        return false;
      }

      if (needsFence) {
        const withEdit = todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                title: draft.title.trim(),
                dueDate: draft.dueDate,
                dueTime: draft.dueTime,
                priority: draft.priority,
              }
            : todo,
        );
        const fenced = await applyFenceOrder(withEdit, id, draft.priority);
        if (!fenced.saved) {
          setNotice({ text: 'That edit did not save.', tone: 'problem' });
          return false;
        }
      }

      setNotice(null);
      setReloadToken((token) => token + 1);
      return true;
    },
    [todos, applyFenceOrder],
  );

  const handleDelete = useCallback(async (id: string) => {
    const removed = await deleteTodo(id);
    if (!removed) {
      setNotice({ text: 'That task could not be deleted.', tone: 'problem' });
      return false;
    }
    setNotice(null);
    setTodos((current) => current.filter((todo) => todo.id !== id));
    return true;
  }, []);

  const handleDeleteCompleted = useCallback(async () => {
    setDeletingCompleted(true);
    const removed = await deleteCompletedTodos(viewing);
    setDeletingCompleted(false);
    if (!removed) {
      setConfirmingDelete(false);
      setNotice({ text: 'Those completed tasks could not be deleted.', tone: 'problem' });
      return;
    }
    setNotice(null);
    setTodos((current) => current.filter((todo) => !todo.done));
    setShowCompleted(false);
    setConfirmingDelete(false);
  }, [viewing]);

  const requestDeleteCompleted = useCallback(() => {
    setNotice(null);
    setConfirmingDelete(true);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (over === null || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const currentGroups = groupTodos(todos, clock.today, clock.now);
      const group = currentGroups.find(
        (entry) =>
          entry.todos.some((todo) => todo.id === activeId) &&
          entry.todos.some((todo) => todo.id === overId),
      );
      if (group === undefined) return;

      const previous = todos;
      const orderedIds = clampReorderInGroup(group.todos, activeId, overId);
      const updates = sortOrdersForOrder(orderedIds);
      const byId = new Map(updates.map((update) => [update.id, update.sortOrder]));

      setTodos((current) =>
        current.map((todo) =>
          byId.has(todo.id) ? { ...todo, sortOrder: byId.get(todo.id) as number } : todo,
        ),
      );
      setNotice(null);

      const saved = await reorderTodos(updates);
      if (saved) return;

      setTodos(previous);
      setNotice({ text: 'That order did not save.', tone: 'problem' });
    },
    [todos, clock],
  );

  if (!mounted) return null;

  if (displayStatus === 'missing-table') {
    return (
      <Card>
        <h2 className="text-base font-semibold text-[var(--mt-text)]">Not set up yet</h2>
        <p className="mt-2 text-sm text-[var(--mt-text-muted)]">
          The to-do table does not exist in the database. Run the SQL in
          docs/superpowers/specs/2026-08-26-todo-setup.sql from the Supabase SQL
          editor, then reload this page.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div
        className="inline-grid grid-cols-2 gap-1 rounded-full bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] p-1"
        role="group"
        aria-label="Whose list"
      >
        {USERS.map((user) => (
          <button
            key={user}
            type="button"
            onClick={() => setChosenView(user)}
            aria-pressed={user === viewing}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
              user === viewing
                ? 'bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)]'
                : 'text-[var(--mt-text-muted)]'
            }`}
          >
            {user}
          </button>
        ))}
      </div>

      <TodoComposer owner={signedIn} onAdd={handleAdd} />

      {notice ? (
        <p
          role="status"
          className={`text-sm ${
            notice.tone === 'problem' ? 'text-[var(--mt-danger)]' : 'text-[var(--mt-text-muted)]'
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {displayStatus === 'loading' ? (
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      ) : null}

      {displayStatus === 'error' ? (
        <p className="text-sm text-[var(--mt-danger)]">
          Could not reach the database. Check your connection and reload.
        </p>
      ) : null}

      {displayStatus === 'ok' && groups.length === 0 ? (
        <p className="text-sm text-[var(--mt-text-muted)]">
          Nothing due. Add a task above.
        </p>
      ) : null}

      {groups.map((group) => (
        <DndContext
          key={group.name}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <TodoGroup
            group={group}
            onToggle={handleToggle}
            onOpen={setEditing}
            onPriority={handlePriority}
          />
        </DndContext>
      ))}

      {finished.length === 0 ? null : (
        <button
          type="button"
          onClick={() => setShowCompleted((current) => !current)}
          className="min-h-11 text-left text-sm text-[var(--mt-text-muted)] underline"
        >
          {showCompleted ? 'Hide completed' : `Show completed (${finished.length})`}
        </button>
      )}

      {showCompleted && finished.length > 0 ? (
        <TodoGroup
          group={{ name: 'Completed', todos: finished }}
          onToggle={handleToggle}
          onOpen={setEditing}
          onDeleteCompleted={requestDeleteCompleted}
          sortable={false}
        />
      ) : null}

      {confirmingDelete ? (
        <Modal
          open
          onClose={() => {
            if (!deletingCompleted) setConfirmingDelete(false);
          }}
          title="Delete completed tasks"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deletingCompleted}
                className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text-muted)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCompleted}
                disabled={deletingCompleted}
                className="min-h-11 rounded-xl bg-[var(--mt-danger)] px-4 text-sm font-semibold text-[var(--mt-danger-contrast)] disabled:opacity-50"
              >
                {deletingCompleted ? 'Deleting…' : 'Delete all'}
              </button>
            </div>
          }
        >
          <p className="text-sm text-[var(--mt-text-muted)]">
            Are you sure you want to delete all completed tasks? This cannot be undone.
          </p>
        </Modal>
      ) : null}

      {editing === null ? null : (
        <TodoEditModal
          todo={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {viewing === signedIn && displayStatus === 'ok' && (
        <AssistantButton
          section={todoSection}
          owner={signedIn}
          rows={todos}
          clock={() => clock}
          onApplied={(message, tone) => {
            setNotice({ text: message, tone });
            setReloadToken((token) => token + 1);
          }}
        />
      )}
    </div>
  );
}
