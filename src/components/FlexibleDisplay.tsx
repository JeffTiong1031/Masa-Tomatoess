'use client';

import { useFlexibleStore } from '@/store/useFlexibleStore';
import { computeRestSeconds } from '@/lib/flexibleTime';
import { useEffect, useState } from 'react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function FlexibleDisplay() {
  const {
    phase,
    elapsedSeconds,
    restTimeLeft,
    restRatio,
    isActive,
    awaitingChoice,
    isAlarmRinging,
  } = useFlexibleStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10" />
    );
  }

  const displaySeconds = phase === 'rest' ? restTimeLeft : elapsedSeconds;
  const predictedRest = computeRestSeconds(elapsedSeconds, restRatio);
  const label = isAlarmRinging
    ? 'Rest Complete'
    : phase === 'rest'
    ? 'Rest'
    : awaitingChoice
    ? 'Paused'
    : isActive
    ? 'Studying'
    : 'Ready';

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm uppercase tracking-[0.2em] text-white/50">{label}</p>

      <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl">
        <span className="text-6xl sm:text-7xl font-light tabular-nums text-white tracking-tight">
          {formatTime(displaySeconds)}
        </span>
      </div>

      {phase === 'study' && elapsedSeconds > 0 && (
        <p className="text-sm text-white/50">
          Rest will be{' '}
          <span className="text-white/80 tabular-nums">{formatTime(predictedRest)}</span>
          <span className="text-white/40"> (study ÷ {restRatio})</span>
        </p>
      )}

      {phase === 'rest' && (
        <p className="text-sm text-white/50">Rest countdown · ratio /{restRatio}</p>
      )}
    </div>
  );
}
