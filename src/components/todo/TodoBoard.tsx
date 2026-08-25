'use client';

import { useCallback, useEffect, useState } from 'react';
import { todayISO, timeISO } from '@/lib/dates';
import { isUserName, USERS, type UserName } from '@/lib/identity';
import { fetchTodos } from '@/lib/todoRepo';
import type { Todo } from '@/lib/todo';
import { useHasMounted } from '@/hooks/useHasMounted';
import Card from '@/components/ui/Card';

type BoardStatus = 'loading' | 'ok' | 'missing-table' | 'error';

interface Clock {
  today: string;
  now: string;
}

export default function TodoBoard() {
  const mounted = useHasMounted();
  const [signedIn, setSignedIn] = useState<UserName | null>(null);
  const [viewing, setViewing] = useState<UserName | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<BoardStatus>('loading');
  const [clock, setClock] = useState<Clock | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user_name');
    const user = isUserName(stored) ? stored : 'Jeff';
    setSignedIn(user);
    setViewing(user);
    setClock({ today: todayISO(), now: timeISO() });
  }, []);

  const load = useCallback(async (owner: UserName) => {
    const result = await fetchTodos(owner);
    if (result.status === 'ok') {
      setTodos(result.rows);
      setStatus('ok');
      return;
    }
    setTodos([]);
    setStatus(result.status);
  }, []);

  useEffect(() => {
    if (viewing === null) return;
    setStatus('loading');
    load(viewing);
  }, [viewing, load]);

  if (!mounted || viewing === null || clock === null) return null;

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
            onClick={() => setViewing(user)}
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
