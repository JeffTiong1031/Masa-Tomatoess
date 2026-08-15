'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy } from 'lucide-react';

type Timeframe = 'today' | 'week' | 'year';

interface LeaderboardData {
  userName: string;
  totalMinutes: number;
}

export default function Leaderboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [data, setData] = useState<LeaderboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);

      const now = new Date();
      const startDate = new Date();

      if (timeframe === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'week') {
        const day = startDate.getDay() || 7;
        if (day !== 1) startDate.setHours(-24 * (day - 1));
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'year') {
        startDate.setFullYear(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
      }

      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('user_name, duration_minutes')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setIsLoading(false);
        return;
      }

      const aggregated = new Map<string, number>();
      sessions?.forEach((session) => {
        const current = aggregated.get(session.user_name) || 0;
        aggregated.set(session.user_name, current + session.duration_minutes);
      });

      const leaderboard: LeaderboardData[] = Array.from(
        aggregated.entries()
      ).map(([userName, totalMinutes]) => ({ userName, totalMinutes }));

      leaderboard.sort((a, b) => b.totalMinutes - a.totalMinutes);

      setData(leaderboard);
      setIsLoading(false);
    }

    fetchLeaderboard();
  }, [timeframe]);

  return (
    <div className="mt-glass shadow-2xl p-5 sm:p-8 rounded-[1.75rem] mb-6 sm:mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-light tracking-wide text-[var(--mt-text)] flex items-center gap-3">
          <Trophy className="text-[var(--mt-rank-gold)]" size={22} aria-hidden />
          Leaderboard
        </h2>

        <div
          className="flex flex-wrap bg-[color-mix(in_srgb,var(--mt-text)_12%,transparent)] p-1 rounded-xl"
          role="tablist"
          aria-label="Leaderboard timeframe"
        >
          {(
            [
              ['today', 'Today'],
              ['week', 'This Week'],
              ['year', 'This Year'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={timeframe === value}
              onClick={() => setTimeframe(value)}
              className={`min-h-10 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeframe === value
                  ? 'bg-[color-mix(in_srgb,var(--mt-text)_12%,transparent)] text-[var(--mt-text)]'
                  : 'text-[var(--mt-text-muted)] hover:text-[var(--mt-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] rounded-2xl" />
          <div className="h-16 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] rounded-2xl" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-[var(--mt-text-subtle)] font-light">
          No sessions recorded for this timeframe yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {data.map((user, index) => {
            const maxMinutes = data[0].totalMinutes;
            const percentage = Math.max(
              5,
              (user.totalMinutes / maxMinutes) * 100
            );

            return (
              <div
                key={user.userName}
                className="relative bg-[color-mix(in_srgb,var(--mt-text)_12%,transparent)] rounded-2xl p-4 overflow-hidden border border-[var(--mt-border)] flex items-center justify-between gap-3"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[color-mix(in_srgb,var(--mt-accent)_10%,transparent)] z-0 transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative z-10 flex items-center gap-3 sm:gap-4 min-w-0">
                  <span
                    className={`font-bold text-lg w-6 shrink-0 ${
                      index === 0
                        ? 'text-[var(--mt-rank-gold)]'
                        : index === 1
                          ? 'text-[var(--mt-text-muted)]'
                          : 'text-[var(--mt-rank-bronze)]'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="font-medium text-[var(--mt-text)] truncate">
                    {user.userName}
                  </span>
                </div>
                <div className="relative z-10 font-light tracking-tight shrink-0">
                  <span className="text-xl sm:text-2xl text-[var(--mt-text)]">
                    {user.totalMinutes}
                  </span>
                  <span className="text-sm text-[var(--mt-text-subtle)] ml-2">min</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
