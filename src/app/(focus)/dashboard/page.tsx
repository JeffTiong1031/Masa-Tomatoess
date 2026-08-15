'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useEffect, useMemo, useState } from 'react';
import { Trash2, TrendingUp, Clock, Target } from 'lucide-react';
import { ActivityCalendar } from 'react-activity-calendar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Leaderboard from '@/components/Leaderboard';
import { clearUserSessions } from '@/app/actions/clearSessions';
import { syncSessions } from '@/lib/sync';
import { buildHeatmapRange, heatmapDaysForWidth } from '@/lib/heatmapRange';
import { useHasMounted } from '@/hooks/useHasMounted';
import { CHART_COLORS, HEATMAP_RAMP } from '@/lib/heatmapTheme';

// react-activity-calendar consumes this as a literal theme prop, not CSS
// custom properties, so hex is correct here. Both keys carry the same
// ramp: supplying only one key makes the library fall back to its own
// defaults for the other. The ramp itself lives in lib/heatmapTheme.ts
// so its five levels can be asserted in tests.
const MACARON_HEATMAP_THEME = {
  light: [...HEATMAP_RAMP],
  dark: [...HEATMAP_RAMP],
};

export default function Dashboard() {
  const mounted = useHasMounted();
  const [userName, setUserName] = useState<string | null>(null);
  const [width, setWidth] = useState(1280);

  useEffect(() => {
    const name = localStorage.getItem('user_name');
    queueMicrotask(() => setUserName(name));
    syncSessions().catch(console.error);
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const allSessions = useLiveQuery(() => db.sessions.toArray()) || [];
  const sessions = allSessions.filter(
    (s) =>
      s.mode === 'focus' &&
      !!userName &&
      (s.userName === userName || !s.userName)
  );

  const handleClearData = async () => {
    if (
      confirm(
        'Are you sure you want to clear your focus history? This cannot be undone.'
      )
    ) {
      try {
        const name = localStorage.getItem('user_name');
        if (name) {
          const result = await clearUserSessions(name);
          if (!result.success) {
            console.error('Failed to clear Supabase history:', result.error);
          }
        }

        if (name) {
          await db.sessions.where('userName').equals(name).delete();
          const oldSessions = await db.sessions
            .filter((s) => !s.userName)
            .primaryKeys();
          await db.sessions.bulkDelete(oldSessions);
        } else {
          await db.sessions.clear();
        }

        window.location.reload();
      } catch (err) {
        console.error('Failed to clear database:', err);
      }
    }
  };

  const handleLogOut = () => {
    if (
      confirm(
        'Are you sure you want to log out? You will need the secret password to enter again.'
      )
    ) {
      localStorage.removeItem('user_name');
      window.location.href = '/';
    }
  };

  const heatmapDataMap = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      map.set(s.date, (map.get(s.date) || 0) + 1);
    });
    return map;
  }, [sessions]);

  const heatmapDays = heatmapDaysForWidth(width);
  const heatmapData = useMemo(
    () => buildHeatmapRange(heatmapDataMap, heatmapDays),
    [heatmapDataMap, heatmapDays]
  );

  const weeklyData = useMemo(() => {
    const today = new Date();
    const rows = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter((s) => s.date === dateStr);
      const totalMinutes = daySessions.reduce(
        (sum, s) => sum + s.durationMinutes,
        0
      );
      rows.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: totalMinutes,
      });
    }
    return rows;
  }, [sessions]);

  const totalFocusSessions = sessions.length;
  const totalFocusMinutes = sessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);
  const todayKey = new Date().toISOString().split('T')[0];

  if (!mounted) {
    return <div className="min-h-dvh bg-[var(--mt-bg)]" />;
  }

  return (
    <main
      className="flex-1 text-[var(--mt-text)] overflow-y-auto mt-page-pad-focus"
      style={{ ['--mt-accent' as string]: 'var(--mac-accent-dashboard)' }}
    >
      <div className="max-w-5xl mx-auto px-1 sm:px-2 pb-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-tight">
              Analytics
            </h1>
            <p className="text-sm text-[var(--mt-text-muted)] mt-1">
              Your focus history across devices
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLogOut}
              className="min-h-11 px-5 py-2.5 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--mt-text)_12%,transparent)] border border-[var(--mt-border)] rounded-xl text-sm font-medium text-[var(--mt-text-muted)] hover:text-[var(--mt-text)] transition-all"
            >
              Log Out
            </button>
            <button
              type="button"
              onClick={handleClearData}
              className="min-h-11 flex items-center gap-2 px-5 py-2.5 bg-[color-mix(in_srgb,var(--mt-danger)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--mt-danger)_20%,transparent)] border border-[color-mix(in_srgb,var(--mt-danger)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--mt-danger)_30%,transparent)] rounded-xl text-sm font-medium text-[var(--mt-danger)] transition-all"
              title="Clear History"
            >
              <Trash2 size={16} />
              Clear History
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <StatCard
            icon={<Target size={22} />}
            label="Total Focus Sessions"
            value={String(totalFocusSessions)}
          />
          <StatCard
            icon={<Clock size={22} />}
            label="Total Focus Time"
            value={
              <>
                {totalFocusHours}{' '}
                <span className="text-lg text-[var(--mt-text-subtle)] font-normal">hrs</span>
              </>
            }
          />
          <StatCard
            icon={<TrendingUp size={22} />}
            label="Today's Focus"
            value={
              <>
                {heatmapDataMap.get(todayKey) || 0}{' '}
                <span className="text-lg text-[var(--mt-text-subtle)] font-normal">
                  sessions
                </span>
              </>
            }
          />
        </div>

        <Leaderboard />

        <div className="mt-soft p-5 sm:p-8 mb-6 sm:mb-8 overflow-x-auto">
          <h2 className="text-lg sm:text-xl font-light tracking-wide text-[var(--mt-text)] mb-6">
            Contribution Heatmap
            <span className="block sm:inline text-sm text-[var(--mt-text-subtle)] sm:ml-2">
              Last {heatmapDays} days
            </span>
          </h2>
          <div className="min-w-0">
            <ActivityCalendar
              data={heatmapData}
              theme={MACARON_HEATMAP_THEME}
              colorScheme="dark"
              blockSize={width < 640 ? 10 : 12}
              blockMargin={3}
              fontSize={width < 640 ? 11 : 12}
              labels={{
                legend: {
                  less: 'Less',
                  more: 'More',
                },
                months: [
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ],
                totalCount: '{{count}} sessions in this range',
              }}
            />
          </div>
        </div>

        <div className="mt-soft p-5 sm:p-8 h-72 sm:h-[26rem]">
          <h2 className="text-lg sm:text-xl font-light tracking-wide text-[var(--mt-text)] mb-6">
            Focus Minutes (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={weeklyData}>
              <XAxis
                dataKey="name"
                stroke={CHART_COLORS.axis}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={CHART_COLORS.axis}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: CHART_COLORS.border }}
                contentStyle={{
                  background: CHART_COLORS.tooltipBackground,
                  border: `1px solid ${CHART_COLORS.border}`,
                  borderRadius: 12,
                  color: CHART_COLORS.tooltipText,
                }}
              />
              <Bar
                dataKey="minutes"
                fill={CHART_COLORS.bar}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="mt-soft p-5 sm:p-6 flex items-start gap-4 transition-all hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]">
      <div
        className="p-3 rounded-2xl shadow-inner border border-[var(--mt-border)] text-[var(--mt-text)]"
        style={{
          background: 'color-mix(in srgb, var(--mt-accent) 35%, transparent)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[var(--mt-text-muted)] text-sm font-medium tracking-wide mb-1">
          {label}
        </p>
        <p className="text-3xl sm:text-4xl font-light tracking-tight">{value}</p>
      </div>
    </div>
  );
}
