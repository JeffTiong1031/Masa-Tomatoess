'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import { fetchEvents } from '@/lib/calendarRepo';
import { countdownRows, type CountdownRow } from '@/lib/countdownList';
import { formatShortDate, todayISO } from '@/lib/dates';

export default function CountdownBoard() {
  const mounted = useHasMounted();
  const [rows, setRows] = useState<CountdownRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const events = await fetchEvents();
    if (events === null) {
      setFailed(true);
      return;
    }
    setRows(countdownRows(events, todayISO()));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
    });
  }, [mounted, load]);

  if (!mounted || (!loaded && !failed)) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      </Card>
    );
  }

  if (failed) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text)]">Could not load.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            load();
          }}
          className="mt-3 min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Try again
        </button>
      </Card>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      {rows.length === 0 ? (
        <Card>
          <p className="text-base font-medium text-[var(--mt-text)]">
            Nothing to count down to yet
          </p>
          <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
            Tick “count down to this” on an event and it turns up here.
          </p>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                  {row.title}
                </div>
                <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                  {formatShortDate(row.date)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-semibold text-[var(--mt-text)]">
                  {row.daysUntil}
                </div>
                <div className="text-xs text-[var(--mt-text-subtle)]">
                  {row.daysUntil === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}

      <Link
        href="/study/calendar"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
      >
        Add a date in the calendar
      </Link>
    </div>
  );
}
