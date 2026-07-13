'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useState } from 'react';

export default function TimerDisplay() {
  const { timeLeft, mode, settings, currentCycle } = useTimerStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration errors with zustand persist
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'focus':
        return 'Focus Session';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  // Calculate progress for the circular ring
  let totalSeconds = settings.focusTime * 60;
  if (mode === 'shortBreak') totalSeconds = settings.shortBreak * 60;
  else if (mode === 'longBreak') totalSeconds = settings.longBreak * 60;

  const progress = mounted ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!mounted) {
    return <div className="h-[360px] w-[360px] flex items-center justify-center text-2xl font-light text-white/50 animate-pulse">Loading...</div>;
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-[360px] h-[360px] bg-black/30 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
      {/* Circular Progress */}
      <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
        <circle
          cx="180"
          cy="180"
          r={radius}
          className="text-white/5 stroke-current"
          strokeWidth="12"
          fill="transparent"
        />
        <circle
          cx="180"
          cy="180"
          r={radius}
          className="text-blue-500 stroke-current transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
          strokeWidth="12"
          strokeLinecap="round"
          fill="transparent"
          style={{ strokeDasharray: circumference, strokeDashoffset }}
        />
      </svg>

      {/* Timer Text */}
      <div className="text-center z-10 flex flex-col items-center mt-2">
        <span className="text-xs font-bold tracking-[0.25em] text-white/50 uppercase mb-3">
          {getModeLabel()}
        </span>
        <h1 className="text-[5.5rem] leading-none font-extralight tabular-nums tracking-tighter text-white drop-shadow-2xl">
          {formatTime(timeLeft)}
        </h1>
        
        {/* Cycle Track */}
        <div className="flex items-center gap-2 mt-6">
          {Array.from({ length: settings.cycleCount }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 shadow-sm ${
                i < currentCycle ? 'bg-white scale-110 shadow-white/50' : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
