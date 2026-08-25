'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { todayISO, timeISO } from '@/lib/dates';
import { isUserName, USERS, type UserName } from '@/lib/identity';
import { fetchTodos, insertTodo } from '@/lib/todoRepo';
import type { Todo, TodoDraft } from '@/lib/todo';
import { useHasMounted } from '@/hooks/useHasMounted';
import Card from '@/components/ui/Card';
import TodoComposer from '@/components/todo/TodoComposer';

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
  const [clock, setClock] = useState<Clock>(() => ({ today: todayISO(), now: timeISO() }));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTodos(viewing).then((result) => {
      if (cancelled) return;
      if (result.status === 'ok') {
        setTodos(result.rows);
        setStatus('ok');
        return;
      }
      setTodos([]);
      setStatus(result.status);
    });
    return () => {
      cancelled = true;
    };
  }, [viewing]);

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

  if (!mounted) return null;

  if (status === 'missing-table') {
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

      {status === 'loading' ? (
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      ) : null}

      {status === 'error' ? (
        <p className="text-sm text-[var(--mt-danger)]">
          Could not reach the database. Check your connection and reload.
        </p>
      ) : null}
    </div>
  );
}
