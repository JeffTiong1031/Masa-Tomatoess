'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { computeHubStats } from '@/lib/hubStats';
import { ALL_LINKS } from '@/components/nav/navLinks';
import { accentVar } from '@/components/ui/PageShell';
import StatTile from '@/components/ui/StatTile';
import { useHasMounted } from '@/hooks/useHasMounted';
import { hubCycleLabel, summarizeCycle, type PeriodLog } from '@/lib/cycle';
import { monthGridDates, monthOf, todayISO } from '@/lib/dates';
import { fetchPeriods } from '@/lib/cycleRepo';
import { fetchEvents, fetchPinnedEventIds } from '@/lib/calendarRepo';
import { fetchTodos } from '@/lib/todoRepo';
import { fetchCountUpEntries, fetchPinnedCountUpIds } from '@/lib/countUpRepo';
import { buildAgenda } from '@/lib/todayAgenda';
import { buildMonthGrid, busyDates } from '@/lib/monthGrid';
import { buildBannerCards } from '@/lib/bannerCards';
import { isUserName, type UserName } from '@/lib/identity';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { Todo } from '@/lib/todo';
import type { CountUpEntry } from '@/lib/countUpList';
import TodayCalendarCard from '@/components/home/TodayCalendarCard';
import RotatingBanner from '@/components/home/RotatingBanner';

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HubGrid() {
  // useHasMounted (useSyncExternalStore under the hood, same pattern as
  // Gatekeeper.tsx) reports false on the server and on the first client
  // render, then flips true afterwards. That keeps the SSR/hydration
  // render pure — localStorage.getItem and the wall-clock greeting are
  // only ever evaluated once we're safely client-only, so there is no
  // server/client markup mismatch to warn about.
  const mounted = useHasMounted();
  const userName = mounted ? localStorage.getItem('user_name') : null;
  const greeting = mounted ? greetingForHour(new Date().getHours()) : 'Welcome';
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const [cycleLogs, setCycleLogs] = useState<PeriodLog[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [countUps, setCountUps] = useState<CountUpEntry[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('user_name');
    const owner: UserName = isUserName(stored) ? stored : 'Jeff';

    (async () => {
      const [
        rows,
        eventRows,
        todoResult,
        entryRows,
        pinnedEvents,
        pinnedEntries,
      ] = await Promise.all([
        fetchPeriods(),
        fetchEvents(),
        fetchTodos(owner),
        fetchCountUpEntries(owner),
        fetchPinnedEventIds(owner),
        fetchPinnedCountUpIds(owner),
      ]);

      if (rows) setCycleLogs(rows);
      if (eventRows) setEvents(eventRows.filter((row) => row.owner === owner));
      if (todoResult.status === 'ok') setTodos(todoResult.rows);
      if (entryRows) setCountUps(entryRows);
      setPinnedIds(new Set([...pinnedEvents, ...pinnedEntries]));
    })();
  }, [mounted]);

  const cycleLabel =
    cycleLogs === null
      ? null
      : hubCycleLabel(summarizeCycle(cycleLogs, todayISO()));

  const stats = computeHubStats(sessions ?? [], new Date());

  const today = mounted ? todayISO() : '';
  const agenda = buildAgenda(events, todos, today, 4);
  const cells = mounted
    ? buildMonthGrid(
        today,
        busyDates(events, todos, monthGridDates(monthOf(today))),
      )
    : [];
  const cards = buildBannerCards(
    cycleLabel,
    stats.streakDays,
    events.filter((event) => pinnedIds.has(event.id)),
    countUps.filter((entry) => pinnedIds.has(entry.id)),
    today,
  );

  const sections = ALL_LINKS.filter((l) => l.href !== '/');

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {greeting}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          {stats.todayMinutes > 0
            ? `${stats.todayMinutes} focus minutes today.`
            : 'No focus time logged yet today.'}
        </p>
      </div>

      {mounted ? (
        <TodayCalendarCard today={today} agenda={agenda} cells={cells} />
      ) : (
        <div className="mt-soft mb-6 min-h-[39rem] sm:min-h-[22rem]" aria-hidden />
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_2fr]">
        <StatTile
          label="Today"
          value={`${stats.todayMinutes} min`}
          accent="timer"
        />
        <RotatingBanner cards={cards} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {sections.map(({ href, label, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="mt-soft flex flex-col gap-2 p-4 transition-transform active:scale-[0.98]"
            style={{ ['--mt-accent' as string]: accentVar(accent) }}
          >
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'var(--mt-accent)' }}
            >
              <Icon
                size={18}
                strokeWidth={1.9}
                aria-hidden
                className="text-[var(--mt-accent-contrast)]"
              />
            </span>
            <span className="text-sm font-semibold text-[var(--mt-text)]">
              {label}
            </span>
            {href === '/cycle' && cycleLabel ? (
              <span className="text-xs text-[var(--mt-text-muted)]">
                {cycleLabel}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}
