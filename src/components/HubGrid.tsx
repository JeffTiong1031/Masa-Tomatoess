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
import { todayISO } from '@/lib/cycleDates';
import { fetchPeriods } from '@/lib/cycleRepo';

/** Sections with no data layer yet (spec §7.1). Cycle now reads and writes
 *  Supabase, so it is no longer inert. Calendar is still inert; Timetable
 *  is not (it now reads and writes Supabase). Both are no longer top-level
 *  cards here -- both live inside Study now, behind its own panel. */
const INERT = new Set([
  '/countdown',
  '/meals',
  '/fitness',
  '/finance',
]);

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

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const rows = await fetchPeriods();
      if (rows) setCycleLogs(rows);
    })();
  }, [mounted]);

  const cycleLabel =
    cycleLogs === null
      ? null
      : hubCycleLabel(summarizeCycle(cycleLogs, todayISO()));

  const stats = computeHubStats(sessions ?? [], new Date());

  const cards = ALL_LINKS.filter((l) => l.href !== '/');

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

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile
          label="Today"
          value={`${stats.todayMinutes} min`}
          accent="timer"
        />
        <StatTile
          label="Streak"
          value={stats.streakDays === 1 ? '1 day' : `${stats.streakDays} days`}
          accent="dashboard"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(({ href, label, icon: Icon, accent }) => (
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
            <span className="text-xs text-[var(--mt-text-muted)]">
              {INERT.has(href)
                ? 'Coming soon'
                : href === '/cycle'
                  ? (cycleLabel ?? 'Open')
                  : 'Open'}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
