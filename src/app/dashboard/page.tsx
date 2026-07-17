'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useEffect, useState } from 'react';
import { Trash2, TrendingUp, Clock, Target } from 'lucide-react';
import { ActivityCalendar } from 'react-activity-calendar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Leaderboard from '@/components/Leaderboard';
import { clearUserSessions } from '@/app/actions/clearSessions';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all sessions from Dexie
  const sessions = useLiveQuery(() => db.sessions.toArray()) || [];

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear your focus history? This cannot be undone.')) {
      try {
        const userName = localStorage.getItem('user_name');
        
        // 1. Delete from Supabase via secure Server Action
        if (userName) {
          const result = await clearUserSessions(userName);
          if (!result.success) {
            console.error('Failed to clear Supabase history:', result.error);
          }
        }
        
        // 2. Delete from Dexie (only for this user, or fallback to clear all if no userName is attached to old records?)
        // To be safe and clean up legacy data without a userName, if we are clearing, we can delete where userName == current or userName is undefined.
        // Actually, to be precise, let's delete only current user's records to preserve the other user's local history.
        if (userName) {
           await db.sessions.where('userName').equals(userName).delete();
           // also delete old legacy records that had no username, assuming they belonged to this user or are just old
           const oldSessions = await db.sessions.filter(s => !s.userName).primaryKeys();
           await db.sessions.bulkDelete(oldSessions);
        } else {
           await db.sessions.clear();
        }
        
        // Force a reload to refresh the leaderboard
        window.location.reload();
      } catch (err) {
        console.error('Failed to clear database:', err);
      }
    }
  };

  const handleLogOut = () => {
    if (confirm('Are you sure you want to log out? You will need the secret password to enter again.')) {
      localStorage.removeItem('user_name');
      window.location.href = '/';
    }
  };

  if (!mounted) return <div className="min-h-screen bg-zinc-950" />;

  // Process data for Activity Calendar (Heatmap)
  const heatmapDataMap = new Map<string, number>();
  sessions.forEach(s => {
    if (s.mode === 'focus') {
      heatmapDataMap.set(s.date, (heatmapDataMap.get(s.date) || 0) + 1);
    }
  });

  // react-activity-calendar requires at least a full year of data to look good.
  // We'll generate a base year of 0 counts, and override with actual data.
  const today = new Date();
  const heatmapData = [];
  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = heatmapDataMap.get(dateStr) || 0;
    
    // Level is 0-4 for GitHub style coloring
    let level = 0;
    if (count >= 8) level = 4;
    else if (count >= 5) level = 3;
    else if (count >= 3) level = 2;
    else if (count >= 1) level = 1;

    heatmapData.push({
      date: dateStr,
      count,
      level
    });
  }

  // Process data for Weekly Bar Chart
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const daySessions = sessions.filter(s => s.date === dateStr && s.mode === 'focus');
    const totalMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    
    weeklyData.push({
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: totalMinutes,
    });
  }

  // Aggregate Stats
  const totalFocusSessions = sessions.filter(s => s.mode === 'focus').length;
  const totalFocusMinutes = sessions.filter(s => s.mode === 'focus').reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        
        <header className="flex items-center justify-between mb-12 mt-16">
          <div>
            <h1 className="text-5xl font-extralight tracking-tight drop-shadow-md">Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogOut}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all shadow-lg"
            >
              Log Out
            </button>
            <button 
              onClick={handleClearData}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 transition-all shadow-lg"
              title="Clear History"
            >
              <Trash2 size={16} />
              Clear History
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-[2rem] flex items-start gap-4 transition-all hover:bg-white/10">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl shadow-inner border border-white/5">
              <Target size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium tracking-wide mb-1">Total Focus Sessions</p>
              <p className="text-4xl font-light tracking-tight">{totalFocusSessions}</p>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-[2rem] flex items-start gap-4 transition-all hover:bg-white/10">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner border border-white/5">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium tracking-wide mb-1">Total Focus Time</p>
              <p className="text-4xl font-light tracking-tight">{totalFocusHours} <span className="text-lg text-white/40 font-normal">hrs</span></p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-[2rem] flex items-start gap-4 transition-all hover:bg-white/10">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl shadow-inner border border-white/5">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium tracking-wide mb-1">Today's Focus</p>
              <p className="text-4xl font-light tracking-tight">{heatmapDataMap.get(today.toISOString().split('T')[0]) || 0} <span className="text-lg text-white/40 font-normal">sessions</span></p>
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <Leaderboard />

        {/* Heatmap Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-8 rounded-[2.5rem] mb-8 overflow-x-auto">
          <h2 className="text-xl font-light tracking-wide text-white/90 mb-8">Contribution Heatmap</h2>
          <div className="min-w-[800px]">
            <ActivityCalendar 
              data={heatmapData} 
              theme={{
                light: ['#27272a', '#047857', '#059669', '#10b981', '#34d399'],
                dark: ['#27272a', '#064e3b', '#065f46', '#047857', '#10b981'],
              }}
              colorScheme="dark"
              labels={{
                legend: {
                  less: 'Less',
                  more: 'More'
                },
                months: [
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ],
                totalCount: '{{count}} sessions in the last year'
              }}
            />
          </div>
        </div>

        {/* Weekly Chart Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-8 rounded-[2.5rem] h-[26rem]">
          <h2 className="text-xl font-light tracking-wide text-white/90 mb-8">Focus Minutes (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#27272a' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
              />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </main>
  );
}
