'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { computeHubStats } from '@/lib/hubStats';
import { hubDoors } from '@/components/nav/navLinks';
import { accentVar } from '@/components/ui/PageShell';
import { useHasMounted } from '@/hooks/useHasMounted';
import { hubCycleLabel, summarizeCycle, type PeriodLog } from '@/lib/cycle';
import {
  WEEKDAYS,
  formatMonthYear,
  monthGridDates,
  monthOf,
  todayISO,
  weekdayIndex,
} from '@/lib/dates';
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
import HomeFocusTile from '@/components/home/HomeFocusTile';

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${formatMonthYear(`${year}-${`${month}`.padStart(2, '0')}`)}`;
}

export default function HubGrid() {
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

  const sections = hubDoors();

  return (
    <>
      <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-baseline">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {greeting}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-sm text-[var(--mt-text-muted)] md:ml-2">
          {stats.todayMinutes > 0
            ? `${stats.todayMinutes} focus minutes today.`
            : 'No focus time logged yet today.'}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-12 md:gap-x-16 md:gap-y-12">
        <div className="md:col-span-7 md:row-start-1">
          {mounted ? (
            <>
              <h2 className="text-6xl font-semibold leading-[0.9] tracking-tighter text-[var(--mt-text)] md:text-7xl lg:text-8xl">
                {WEEKDAYS[weekdayIndex(today)]}
              </h2>
              <p className="mt-4 text-lg font-medium text-[var(--mt-text-muted)] md:text-xl">
                {longDate(today)}
              </p>
              <div className="mt-10 mb-8 h-0.5 w-12 bg-[var(--mt-text)]" />
              {agenda.items.length === 0 ? (
                <p className="text-lg text-[var(--mt-text-muted)]">
                  Nothing today.
                </p>
              ) : (
                <ul className="flex max-w-sm flex-col gap-4">
                  {agenda.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4">
                      <span
                        className="inline-flex min-w-16 shrink-0 justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-bg)] px-3 py-1 text-xs font-semibold text-[var(--mt-text)]"
                        style={
                          item.kind === 'todo' && item.late
                            ? {
                                background:
                                  'color-mix(in srgb, var(--mt-danger) 16%, transparent)',
                                borderColor: 'transparent',
                              }
                            : undefined
                        }
                      >
                        {item.chip}
                      </span>
                      <span className="truncate text-lg font-medium text-[var(--mt-text)] md:text-xl">
                        {item.title}
                      </span>
                      {item.kind === 'todo' && item.late ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: 'var(--mt-danger)' }}
                          aria-hidden
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {agenda.hiddenCount > 0 ? (
                <Link
                  href={agenda.moreHref}
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-[var(--mt-text-muted)]"
                >
                  +{agenda.hiddenCount} more
                </Link>
              ) : null}
            </>
          ) : (
            <div className="min-h-[16rem]" aria-hidden />
          )}
        </div>

        <div className="flex flex-col gap-6 md:col-span-5 md:row-span-2 md:row-start-1">
          {mounted ? (
            <TodayCalendarCard
              today={today}
              cells={cells}
              listedCount={agenda.items.length + agenda.hiddenCount}
            />
          ) : (
            <div className="mt-soft min-h-[22rem]" aria-hidden />
          )}
          <HomeFocusTile minutes={stats.todayMinutes} />
          <RotatingBanner cards={cards} streakDays={stats.streakDays} />
        </div>

        <div className="mt-8 border-t border-[var(--mt-border)] pt-8 md:col-span-7 md:row-start-2 md:mt-0">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {sections.map(({ href, label, icon: Icon, accent }) => (
              <Link
                key={href}
                href={href}
                className="mt-soft flex min-h-[5.75rem] flex-col items-center justify-center gap-2 p-3 text-center transition-transform active:scale-[0.98]"
                style={{ ['--mt-accent' as string]: accentVar(accent) }}
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mt-accent)]">
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
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
