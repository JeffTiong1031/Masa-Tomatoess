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
      let startDate = new Date();

      if (timeframe === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'week') {
        // Start of current week (Monday)
        const day = startDate.getDay() || 7; 
        if (day !== 1) startDate.setHours(-24 * (day - 1));
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'year') {
        startDate.setFullYear(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
      }

      // Supabase query
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('user_name, duration_minutes')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setIsLoading(false);
        return;
      }

      // Aggregate
      const aggregated = new Map<string, number>();
      sessions?.forEach((session) => {
        const current = aggregated.get(session.user_name) || 0;
        aggregated.set(session.user_name, current + session.duration_minutes);
      });

      const leaderboard: LeaderboardData[] = Array.from(aggregated.entries()).map(
        ([userName, totalMinutes]) => ({ userName, totalMinutes })
      );
      
      // Sort descending
      leaderboard.sort((a, b) => b.totalMinutes - a.totalMinutes);

      setData(leaderboard);
      setIsLoading(false);
    }

    fetchLeaderboard();
  }, [timeframe]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-8 rounded-[2.5rem] mb-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-light tracking-wide text-white/90 flex items-center gap-3">
          <Trophy className="text-yellow-500" size={24} />
          Leaderboard
        </h2>
        
        <div className="flex bg-black/20 p-1 rounded-xl">
          <button
            onClick={() => setTimeframe('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeframe === 'today' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeframe === 'week' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeframe === 'year' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            This Year
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-white/5 rounded-2xl"></div>
          <div className="h-16 bg-white/5 rounded-2xl"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-white/40 font-light">
          No sessions recorded for this timeframe yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((user, index) => {
            // Find max for percentage bar
            const maxMinutes = data[0].totalMinutes;
            const percentage = Math.max(5, (user.totalMinutes / maxMinutes) * 100);
            
            return (
              <div key={user.userName} className="relative bg-black/20 rounded-2xl p-4 overflow-hidden border border-white/5 flex items-center justify-between">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-blue-500/10 z-0 transition-all duration-1000 ease-out" 
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative z-10 flex items-center gap-4">
                  <span className={`font-bold text-lg w-6 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-zinc-400' : 'text-orange-400'}`}>
                    #{index + 1}
                  </span>
                  <span className="font-medium text-white/90">{user.userName}</span>
                </div>
                <div className="relative z-10 font-light tracking-tight">
                  <span className="text-2xl text-white">{user.totalMinutes}</span>
                  <span className="text-sm text-white/40 ml-2">min</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
