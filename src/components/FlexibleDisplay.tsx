'use client';

import { useFlexibleStore } from '@/store/useFlexibleStore';
import { computeRestSeconds } from '@/lib/flexibleTime';
import { useHasMounted } from '@/hooks/useHasMounted';

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
  const mounted = useHasMounted();

  if (!mounted) {
    return (
      <div className="w-[min(80vw,20rem)] aspect-square rounded-[var(--mt-radius-card)] mt-glass" />
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
    <div className="flex flex-col items-center gap-4 w-full max-w-[20rem]">
      <p className="text-sm uppercase tracking-[0.2em] text-white/50">{label}</p>

      <div className="relative flex items-center justify-center w-full aspect-square rounded-[var(--mt-radius-card)] mt-glass shadow-2xl">
        <span
          className="text-[clamp(2.5rem,14vw,4.5rem)] font-light tabular-nums text-white tracking-tight"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatTime(displaySeconds)}
        </span>
      </div>

      {phase === 'study' && elapsedSeconds > 0 && (
        <p className="text-sm text-white/50 text-center px-2">
          Rest will be{' '}
          <span className="text-white/80 tabular-nums">
            {formatTime(predictedRest)}
          </span>
          <span className="text-white/40"> (study ÷ {restRatio})</span>
        </p>
      )}

      {phase === 'rest' && (
        <p className="text-sm text-white/50">Rest countdown · ratio /{restRatio}</p>
      )}
    </div>
  );
}
