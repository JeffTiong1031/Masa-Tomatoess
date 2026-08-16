'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { USERS, isUserName, partnerOf, type UserName } from '@/lib/identity';
import type { TimetableEntry } from '@/lib/timetable';
import { useHasMounted } from '@/hooks/useHasMounted';
import TimetablePane, { type PaneState } from './TimetablePane';

interface TimetableRow {
  user_name: UserName;
  entries: TimetableEntry[];
}

type Entries = Record<UserName, TimetableEntry[]>;

export default function TimetableBoard() {
  const mounted = useHasMounted();
  const stored = mounted ? localStorage.getItem('user_name') : null;
  const me = isUserName(stored) ? stored : null;

  const [entries, setEntries] = useState<Entries | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('timetables')
      .select('user_name, entries')
      .in('user_name', [...USERS]);

    if (error) {
      console.error('Failed to load timetables:', error);
      setFailed(true);
      return;
    }

    const rows = (data || []) as TimetableRow[];
    const next: Entries = { Jeff: [], Rachel: [] };
    for (const row of rows) next[row.user_name] = row.entries;
    setEntries(next);
  }, []);

  useEffect(() => {
    if (!me) return;
    (async () => {
      await load();
    })();
  }, [me, load]);

  if (!me) return null;

  const stateFor = (user: UserName): PaneState => {
    if (failed) return { status: 'error' };
    if (!entries) return { status: 'loading' };
    return { status: 'ready', entries: entries[user] };
  };

  const retry = () => {
    setFailed(false);
    setEntries(null);
    load();
  };

  return (
    <div className="mb-4">
      <TimetablePane name={me} isMine state={stateFor(me)} onRetry={retry} />
      <TimetablePane
        name={partnerOf(me)}
        isMine={false}
        state={stateFor(partnerOf(me))}
        onRetry={retry}
      />
    </div>
  );
}
