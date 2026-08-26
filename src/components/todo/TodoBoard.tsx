'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { todayISO, timeISO } from '@/lib/dates';
import { isUserName, USERS, type UserName } from '@/lib/identity';
import { fetchTodos, insertTodo, setTodoDone, updateTodo, deleteTodo } from '@/lib/todoRepo';
import { completedTodos, groupTodos } from '@/lib/todoList';
import type { Todo, TodoDraft } from '@/lib/todo';
import { useHasMounted } from '@/hooks/useHasMounted';
import Card from '@/components/ui/Card';
import TodoComposer from '@/components/todo/TodoComposer';
import TodoGroup from '@/components/todo/TodoGroup';
import TodoEditModal from '@/components/todo/TodoEditModal';

type BoardStatus = 'loading' | 'ok' | 'missing-table' | 'error';

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
  const [notice, setNotice] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
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

  const handleAdd = useCallback(
    async (draft: TodoDraft) => {
      const created = await insertTodo(draft);
      if (created === null) {
        setNotice('That task did not save. Try again.');
        return;
      }
      setNotice(null);
      setChosenView(draft.owner);
      if (draft.owner === viewing) setTodos((current) => [...current, created]);
    },
    [viewing],
  );

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
    setNotice('That change did not save.');
  }, []);

  const handleSave = useCallback(async (id: string, draft: TodoDraft) => {
    const saved = await updateTodo(id, draft);
    if (!saved) {
      setNotice('That edit did not save.');
      return;
    }
    setNotice(null);
    setReloadToken((token) => token + 1);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const removed = await deleteTodo(id);
    if (!removed) {
      setNotice('That task could not be deleted.');
      return;
    }
    setNotice(null);
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

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
        <p role="status" className="text-sm text-[var(--mt-danger)]">
          {notice}
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
        <TodoGroup
          key={group.name}
          group={group}
          onToggle={handleToggle}
          onOpen={setEditing}
        />
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

      {showCompleted ? (
        <TodoGroup
          group={{ name: 'Completed', todos: finished }}
          onToggle={handleToggle}
          onOpen={setEditing}
        />
      ) : null}

      {editing === null ? null : (
        <TodoEditModal
          todo={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
