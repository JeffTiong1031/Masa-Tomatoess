'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { USERS, isUserName, partnerOf, type UserName } from '@/lib/identity';
import type { TimelineEntry } from '@/lib/timeline';
import { useHasMounted } from '@/hooks/useHasMounted';
import TimelinePane, { type PaneState } from './TimelinePane';
import TimelineEditor from './TimelineEditor';

interface TimetableRow {
  user_name: UserName;
  entries: TimelineEntry[];
}

type Entries = Record<UserName, TimelineEntry[]>;

export default function TimelineBoard() {
  const mounted = useHasMounted();
  const stored = mounted ? localStorage.getItem('user_name') : null;
  const me = isUserName(stored) ? stored : null;

  const [entries, setEntries] = useState<Entries | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
  }, [setEntries, setFailed]);

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
    setEditing(false);
    setSaveError(null);
    load();
  };

  const myState = stateFor(me);
  const partner = partnerOf(me);

  const handleSave = async (saved: TimelineEntry[]) => {
    setIsSaving(true);
    setSaveError(null);

    const { error } = await supabase.from('timetables').upsert(
      {
        user_name: me,
        entries: saved,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_name' },
    );

    setIsSaving(false);

    if (error) {
      console.error('Failed to save timetable:', error);
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }

    setEntries((current) => ({ ...current!, [me]: saved }));
    setEditing(false);
  };

  return (
    <div className="mb-4">
      <TimelinePane
        name={me}
        isMine
        state={myState}
        onRetry={retry}
        action={
          !editing && myState.status === 'ready' ? (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setEditing(true);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--mt-text)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
            >
              <Pencil size={16} aria-hidden />
              Edit
            </button>
          ) : undefined
        }
        body={
          editing && myState.status === 'ready' ? (
            <TimelineEditor
              initialEntries={myState.entries}
              isSaving={isSaving}
              error={saveError}
              onCancel={() => {
                setEditing(false);
                setSaveError(null);
              }}
              onSave={handleSave}
            />
          ) : undefined
        }
      />
      <TimelinePane
        name={partner}
        isMine={false}
        state={stateFor(partner)}
        onRetry={retry}
      />
    </div>
  );
}
