'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import SessionConflictDialog from '@/components/SessionConflictDialog';
import {
  getBlockingOwner,
  resolveConflictAndStart,
} from '@/lib/sessionOwnership';

export default function Controls() {
  const { isActive, start, pause, skip, reset, isAlarmRinging } = useTimerStore();
  const [showConflict, setShowConflict] = useState(false);

  const handlePlayPause = () => {
    if (isActive) {
      pause();
      return;
    }
    if (isAlarmRinging) {
      start();
      return;
    }
    if (getBlockingOwner() === 'flexible') {
      setShowConflict(true);
      return;
    }
    start();
  };

  const handleConfirmConflict = () => {
    setShowConflict(false);
    resolveConflictAndStart('classic', () => start());
  };

  return (
    <>
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10">
        <button
          type="button"
          onClick={reset}
          className="min-h-12 min-w-12 inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="Reset Timer"
          aria-label="Reset timer"
        >
          <RotateCcw size={24} />
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className={`flex items-center justify-center min-h-20 min-w-20 bg-white text-gray-900 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all ${
            isAlarmRinging
              ? 'mt-pulse-safe animate-pulse ring-4 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]'
              : ''
          }`}
          aria-label={isActive ? 'Pause timer' : 'Start timer'}
        >
          {isActive ? (
            <Pause size={32} className="fill-current" />
          ) : (
            <Play size={32} className="fill-current ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={skip}
          className="min-h-12 min-w-12 inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="Skip Session"
          aria-label="Skip session"
        >
          <SkipForward size={24} />
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
