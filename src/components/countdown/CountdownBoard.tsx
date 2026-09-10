'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import type { CalendarEvent } from '@/lib/calendarEvent';
import {
  deleteEvent,
  fetchEvents,
  insertEvent,
  updateEvent,
} from '@/lib/calendarRepo';
import { localCountUpCache, withoutLocalCountUpEntries } from '@/lib/countUpCache';
import { countdownRows } from '@/lib/countdownList';
import {
  countdownAddInput,
  countdownEditInput,
  planCountdownDelete,
  timeFromEvent,
  type CountdownDeleteChoice,
  type TrackerDateForm,
} from '@/lib/countdownWrite';
import type { CountUpEntry } from '@/lib/countUpList';
import { countUpRows } from '@/lib/countUpList';
import {
  deleteCountUpEntry,
  insertCountUpEntry,
  loadCountUpList,
  updateCountUpEntry,
} from '@/lib/countUpRepo';
import { formatShortDate, todayISO } from '@/lib/dates';
import { msUntilNextLocalMidnight } from '@/lib/dayCount';
import { isUserName, type UserName } from '@/lib/identity';
import { useCountdownTrackerStore } from '@/store/useCountdownTrackerStore';
import CountdownDeleteDialog from './CountdownDeleteDialog';
import TrackerFormModal from './TrackerFormModal';

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit-countdown'; event: CalendarEvent }
  | { kind: 'edit-countup'; id: string; form: TrackerDateForm }
  | { kind: 'delete-countdown'; event: CalendarEvent };

function signedInName(): UserName {
  const stored = localStorage.getItem('user_name');
  return isUserName(stored) ? stored : 'Jeff';
}

function blankForm(today: string): TrackerDateForm {
  return { title: '', date: today, time: '' };
}

export default function CountdownBoard() {
  const mounted = useHasMounted();
  const mode = useCountdownTrackerStore((state) => state.mode);
  const setMode = useCountdownTrackerStore((state) => state.setMode);

  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState('');
  const [owner, setOwner] = useState<UserName>('Jeff');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [countUpEntries, setCountUpEntries] = useState<CountUpEntry[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [countUpLoaded, setCountUpLoaded] = useState(false);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [countUpFailed, setCountUpFailed] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const finish = () => setHydrated(true);
    const unsub = useCountdownTrackerStore.persist.onFinishHydration(finish);
    if (useCountdownTrackerStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);

  const loadEvents = useCallback(async () => {
    const rows = await fetchEvents();
    if (rows === null) {
      setEventsFailed(true);
      return;
    }
    setEvents(rows);
    setEventsLoaded(true);
    setEventsFailed(false);
  }, []);

  const loadCountUp = useCallback(async (who: UserName) => {
    const fallback = localCountUpCache(
      localStorage.getItem('mt-countdown-tracker'),
    );
    const rows = await loadCountUpList(who, fallback);
    if (rows === null) {
      setCountUpFailed(true);
      return;
    }
    setCountUpEntries(rows);
    setCountUpLoaded(true);
    setCountUpFailed(false);
    const next = withoutLocalCountUpEntries(
      localStorage.getItem('mt-countdown-tracker'),
    );
    if (next === null) localStorage.removeItem('mt-countdown-tracker');
    else localStorage.setItem('mt-countdown-tracker', next);
    useCountdownTrackerStore.setState((state) => ({ mode: state.mode }));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      const who = signedInName();
      setToday(todayISO());
      setOwner(who);
      loadEvents();
      loadCountUp(who);
    });
  }, [mounted, loadEvents, loadCountUp]);

  useEffect(() => {
    if (!mounted) return;
    let timer = 0;
    const tick = () => {
      setToday(todayISO());
      timer = window.setTimeout(tick, msUntilNextLocalMidnight(new Date()));
    };
    timer = window.setTimeout(tick, msUntilNextLocalMidnight(new Date()));
    const onVisible = () => {
      if (document.visibilityState === 'visible') setToday(todayISO());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [mounted]);

  if (!mounted || !hydrated || today === '') {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      </Card>
    );
  }

  const countdown = countdownRows(events, today);
  const countUp = countUpRows(countUpEntries, today);
  const rows = mode === 'countdown' ? countdown : countUp;
  const failed = mode === 'countdown' ? eventsFailed : countUpFailed;
  const loaded = mode === 'countdown' ? eventsLoaded : countUpLoaded;

  const openAdd = () => {
    setSaveError(null);
    setDialog({ kind: 'add' });
  };

  const closeDialog = () => {
    setDialog(null);
    setSaveError(null);
    setIsSaving(false);
  };

  const handleSaveForm = async (form: TrackerDateForm) => {
    if (dialog === null) return;

    setIsSaving(true);
    setSaveError(null);

    if (mode === 'countup') {
      const ok =
        dialog.kind === 'add'
          ? (await insertCountUpEntry(owner, form.title, form.date)) !== null
          : dialog.kind === 'edit-countup'
            ? await updateCountUpEntry(dialog.id, owner, form.title, form.date)
            : false;
      setIsSaving(false);
      if (!ok) {
        setSaveError('Could not save. Check your connection and try again.');
        return;
      }
      await loadCountUp(owner);
      closeDialog();
      return;
    }

    const ok =
      dialog.kind === 'add'
        ? await insertEvent(countdownAddInput(form, owner))
        : dialog.kind === 'edit-countdown'
          ? await updateEvent(dialog.event.id, countdownEditInput(dialog.event, form))
          : false;
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }
    await loadEvents();
    closeDialog();
  };

  const handleCountdownDelete = async (choice: CountdownDeleteChoice) => {
    if (dialog?.kind !== 'delete-countdown') return;
    const plan = planCountdownDelete(dialog.event, choice);
    if (plan.action === 'none') {
      closeDialog();
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const ok =
      plan.action === 'update'
        ? await updateEvent(dialog.event.id, plan.input)
        : await deleteEvent(plan.id);
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not update. Check your connection and try again.');
      return;
    }
    await loadEvents();
    closeDialog();
  };

  const handleCountUpDelete = async (id: string) => {
    const ok = await deleteCountUpEntry(id, owner);
    if (!ok) {
      setSaveError('Could not delete. Check your connection and try again.');
      return;
    }
    await loadCountUp(owner);
  };

  const formInitial = (): TrackerDateForm => {
    if (dialog?.kind === 'edit-countdown') {
      return {
        title: dialog.event.title,
        date: dialog.event.date,
        time: timeFromEvent(dialog.event),
      };
    }
    if (dialog?.kind === 'edit-countup') return dialog.form;
    return blankForm(today);
  };

  const retry = () => {
    if (mode === 'countdown') {
      setEventsFailed(false);
      loadEvents();
      return;
    }
    setCountUpFailed(false);
    loadCountUp(owner);
  };

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {(
          [
            { key: 'countdown', label: 'Countdown' },
            { key: 'countup', label: 'Count Up' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key);
              setDialog(null);
              setSaveError(null);
            }}
            aria-pressed={mode === key}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold ${
              mode === key ? '' : 'text-[var(--mt-text-muted)]'
            }`}
            style={
              mode === key
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      {failed && (
        <Card>
          <p className="text-sm text-[var(--mt-text)]">Could not load.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
          >
            Try again
          </button>
        </Card>
      )}

      {saveError !== null && dialog === null && (
        <p className="text-sm text-[var(--mt-danger)]">{saveError}</p>
      )}

      {!failed && !loaded && (
        <Card>
          <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
        </Card>
      )}

      {!failed &&
        loaded &&
        (rows.length === 0 ? (
          <Card>
            <p className="text-base font-medium text-[var(--mt-text)]">
              {mode === 'countdown'
                ? 'Nothing to count down to yet'
                : 'Nothing to count up yet'}
            </p>
            <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
              {mode === 'countdown'
                ? 'Add a date here, or tick “count down to this” on a calendar event.'
                : 'Add a past date to see how many days have gone by.'}
            </p>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSaveError(null);
                    if (mode === 'countdown') {
                      const event = events.find((item) => item.id === row.id);
                      if (event) setDialog({ kind: 'edit-countdown', event });
                      return;
                    }
                    const entry = countUpEntries.find((item) => item.id === row.id);
                    if (entry) {
                      setDialog({
                        kind: 'edit-countup',
                        id: entry.id,
                        form: {
                          title: entry.label,
                          date: entry.date,
                          time: '',
                        },
                      });
                    }
                  }}
                  className="min-h-11 min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                    {row.title}
                  </div>
                  <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                    {formatShortDate(row.date)}
                  </div>
                </button>
                <div className="shrink-0 text-right">
                  <div className="text-xl font-semibold text-[var(--mt-text)]">
                    {row.display}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${row.title}`}
                  onClick={() => {
                    setSaveError(null);
                    if (mode === 'countup') {
                      handleCountUpDelete(row.id);
                      return;
                    }
                    const event = events.find((item) => item.id === row.id);
                    if (event) setDialog({ kind: 'delete-countdown', event });
                  }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:text-[var(--mt-danger)]"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
            </Card>
          ))
        ))}

      <button
        type="button"
        onClick={openAdd}
        disabled={!loaded || failed}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
      >
        Add a date
      </button>

      {(dialog?.kind === 'add' ||
        dialog?.kind === 'edit-countdown' ||
        dialog?.kind === 'edit-countup') && (
        <TrackerFormModal
          mode={mode}
          isEditing={dialog.kind !== 'add'}
          initial={formInitial()}
          isSaving={isSaving}
          error={saveError}
          onClose={closeDialog}
          onSave={handleSaveForm}
        />
      )}

      {dialog?.kind === 'delete-countdown' && (
        <CountdownDeleteDialog
          title={dialog.event.title}
          isSaving={isSaving}
          error={saveError}
          onChoose={handleCountdownDelete}
        />
      )}
    </div>
  );
}
