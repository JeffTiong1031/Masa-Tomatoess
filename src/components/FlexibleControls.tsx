'use client';

import { useFlexibleStore } from '@/store/useFlexibleStore';
import { Play, Square, RotateCcw, SkipForward, Coffee } from 'lucide-react';
import { useState } from 'react';
import SessionConflictDialog from '@/components/SessionConflictDialog';
import {
  getBlockingOwner,
  resolveConflictAndStart,
} from '@/lib/sessionOwnership';

export default function FlexibleControls() {
  const {
    phase,
    isActive,
    awaitingChoice,
    isAlarmRinging,
    elapsedSeconds,
    startStudy,
    stopStudy,
    continueStudy,
    proceedToRest,
    skipRest,
    reset,
    stopAlarm,
  } = useFlexibleStore();
  const [showConflict, setShowConflict] = useState(false);

  const handleStart = () => {
    if (isAlarmRinging) {
      stopAlarm();
      return;
    }
    if (getBlockingOwner() === 'classic') {
      setShowConflict(true);
      return;
    }
    startStudy();
  };

  const handleConfirmConflict = () => {
    setShowConflict(false);
    resolveConflictAndStart('flexible', () => startStudy());
  };

  if (isAlarmRinging) {
    return (
      <div className="flex items-center gap-6 mt-8 sm:mt-10">
        <button
          type="button"
          onClick={stopAlarm}
          className="flex items-center justify-center min-h-20 min-w-20 bg-white text-gray-900 rounded-full hover:scale-105 mt-pulse-safe animate-pulse ring-4 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all"
          title="Dismiss alarm"
          aria-label="Dismiss alarm"
        >
          <Square size={28} className="fill-current" />
        </button>
      </div>
    );
  }

  if (awaitingChoice) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 mt-8 sm:mt-10 w-full max-w-md px-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={continueStudy}
              className="flex items-center gap-2 min-h-12 px-6 py-3 rounded-full bg-white text-zinc-900 font-medium hover:scale-105 transition-all"
            >
              <Play size={18} className="fill-current" />
              Continue
            </button>
            <button
              type="button"
              onClick={proceedToRest}
              disabled={elapsedSeconds <= 0}
              className="flex items-center gap-2 min-h-12 px-6 py-3 rounded-full bg-emerald-500/90 text-white font-medium hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100"
            >
              <Coffee size={18} />
              Proceed to rest
            </button>
          </div>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Reset"
            aria-label="Reset flexible timer"
          >
            <RotateCcw size={20} />
          </button>
        </div>
        <SessionConflictDialog
          open={showConflict}
          onConfirm={handleConfirmConflict}
          onCancel={() => setShowConflict(false)}
        />
      </>
    );
  }

  if (phase === 'rest') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 sm:mt-10">
        <button
          type="button"
          onClick={reset}
          className="min-h-12 min-w-12 inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="Reset"
          aria-label="Reset"
        >
          <RotateCcw size={24} />
        </button>
        <button
          type="button"
          onClick={skipRest}
          className="flex items-center justify-center gap-2 px-8 min-h-20 bg-white text-gray-900 rounded-full hover:scale-105 transition-all"
          title="Skip rest"
          aria-label="Skip rest"
        >
          <SkipForward size={28} />
          <span className="font-medium pr-2">Skip rest</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10">
        <button
          type="button"
          onClick={reset}
          className="min-h-12 min-w-12 inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="Reset"
          aria-label="Reset"
        >
          <RotateCcw size={24} />
        </button>

        <button
          type="button"
          onClick={isActive ? stopStudy : handleStart}
          className="flex items-center justify-center min-h-20 min-w-20 bg-white text-gray-900 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all"
          aria-label={isActive ? 'Stop study' : 'Start study'}
        >
          {isActive ? (
            <Square size={28} className="fill-current" />
          ) : (
            <Play size={32} className="fill-current ml-1" />
          )}
        </button>

        <div className="min-w-12 min-h-12" aria-hidden />
      </div>

      <SessionConflictDialog
        open={showConflict}
        onConfirm={handleConfirmConflict}
        onCancel={() => setShowConflict(false)}
      />
    </>
  );
}
