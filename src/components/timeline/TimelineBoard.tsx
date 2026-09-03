'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { USERS, isUserName, partnerOf, type UserName } from '@/lib/identity';
import type { TimelineEntry } from '@/lib/timeline';
import { todayWeekday, type Weekday } from '@/lib/dates';
import {
  weeksFromRows,
  type TimelineRow,
  type WeekByUser,
} from '@/lib/timelineWeek';
import { useHasMounted } from '@/hooks/useHasMounted';
import TimelinePane, { type PaneState } from './TimelinePane';
import TimelineEditor from './TimelineEditor';
import DayTabs from './DayTabs';
import ClearDialog from './ClearDialog';

export default function TimelineBoard() {
  const mounted = useHasMounted();
  const stored = mounted ? localStorage.getItem('user_name') : null;
  const me = isUserName(stored) ? stored : null;

  const [weeks, setWeeks] = useState<WeekByUser | null>(null);
  const [selected, setSelected] = useState<Weekday>(() => todayWeekday());
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('timetables')
      .select('user_name, weekday, entries')
      .in('user_name', [...USERS]);

    if (error) {
      console.error('Failed to load timelines:', error);
      setFailed(true);
      return;
    }

    setWeeks(weeksFromRows((data ?? []) as TimelineRow[]));
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
    if (weeks === null) return { status: 'loading' };
    return { status: 'ready', entries: weeks[user][selected] };
  };

  const retry = () => {
    setFailed(false);
    setWeeks(null);
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
        weekday: selected,
        entries: saved,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_name,weekday' },
    );

    setIsSaving(false);

    if (error) {
      console.error('Failed to save timeline:', error);
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }

    setWeeks((current) => ({
      ...current!,
      [me]: { ...current![me], [selected]: saved },
    }));
    setEditing(false);
  };

  const clearDays = async (days: Weekday[]) => {
    setIsSaving(true);
    const { error } = await supabase.from('timetables').upsert(
      days.map((day) => ({
        user_name: me,
        weekday: day,
        entries: [],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_name,weekday' },
    );
    setIsSaving(false);

    if (error) {
      console.error('Failed to clear timeline:', error);
      setSaveError('Could not clear. Check your connection and try again.');
      return;
    }

    setClearing(false);
    setEditing(false);
    await load();
  };

  return (
    <div className="mb-4">
      <div className="mb-4 flex items-center gap-3">
        <DayTabs selected={selected} today={todayWeekday()} onSelect={(day) => {
          setSelected(day);
          setEditing(false);
          setSaveError(null);
        }} />
        <button
          type="button"
          onClick={() => setClearing(true)}
          className="min-h-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text-muted)]"
        >
          Clear
        </button>
      </div>
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
      <ClearDialog
        open={clearing}
        weekday={selected}
        isClearing={isSaving}
        onClose={() => setClearing(false)}
        onClearDay={() => clearDays([selected])}
        onClearWeek={() => clearDays([0, 1, 2, 3, 4, 5, 6])}
      />
    </div>
  );
}
