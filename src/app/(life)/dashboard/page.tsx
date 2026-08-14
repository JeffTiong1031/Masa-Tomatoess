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
    return <div className="min-h-dvh bg-[var(--mt-midnight)]" />;
  }

  return (
    <main className="flex-1 text-white overflow-y-auto mt-page-pad">
      <div className="max-w-5xl mx-auto px-1 sm:px-2 pb-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-tight">
              Analytics
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Your focus history across devices
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLogOut}
              className="min-h-11 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
            >
              Log Out
            </button>
            <button
              type="button"
              onClick={handleClearData}
              className="min-h-11 flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 transition-all"
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
            iconClass="bg-blue-500/20 text-blue-400"
            label="Total Focus Sessions"
            value={String(totalFocusSessions)}
          />
          <StatCard
            icon={<Clock size={22} />}
            iconClass="bg-emerald-500/20 text-emerald-400"
            label="Total Focus Time"
            value={
              <>
                {totalFocusHours}{' '}
                <span className="text-lg text-white/40 font-normal">hrs</span>
              </>
            }
          />
          <StatCard
            icon={<TrendingUp size={22} />}
            iconClass="bg-purple-500/20 text-purple-400"
            label="Today's Focus"
            value={
              <>
                {heatmapDataMap.get(todayKey) || 0}{' '}
                <span className="text-lg text-white/40 font-normal">
                  sessions
                </span>
              </>
            }
          />
        </div>

        <Leaderboard />

        <div className="mt-glass shadow-2xl p-5 sm:p-8 rounded-[1.75rem] mb-6 sm:mb-8 overflow-x-auto">
          <h2 className="text-lg sm:text-xl font-light tracking-wide text-white/90 mb-6">
            Contribution Heatmap
            <span className="block sm:inline text-sm text-white/40 sm:ml-2">
              Last {heatmapDays} days
            </span>
          </h2>
          <div className="min-w-0">
            <ActivityCalendar
              data={heatmapData}
              theme={{
                light: ['#27272a', '#047857', '#059669', '#10b981', '#34d399'],
                dark: ['#1e293b', '#064e3b', '#065f46', '#047857', '#10b981'],
              }}
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

        <div className="mt-glass shadow-2xl p-5 sm:p-8 rounded-[1.75rem] h-72 sm:h-[26rem]">
          <h2 className="text-lg sm:text-xl font-light tracking-wide text-white/90 mb-6">
            Focus Minutes (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={weeklyData}>
              <XAxis
                dataKey="name"
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: '#1e293b' }}
                contentStyle={{
                  backgroundColor: '#121a2a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="mt-glass shadow-2xl p-5 sm:p-6 rounded-[1.5rem] flex items-start gap-4 transition-all hover:bg-white/10">
      <div
        className={`p-3 rounded-2xl shadow-inner border border-white/5 ${iconClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-white/60 text-sm font-medium tracking-wide mb-1">
          {label}
        </p>
        <p className="text-3xl sm:text-4xl font-light tracking-tight">{value}</p>
      </div>
    </div>
  );
}
