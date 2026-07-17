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
      <div className="flex items-center gap-6 mt-12">
        <button
          onClick={stopAlarm}
          className="flex items-center justify-center w-20 h-20 bg-white text-gray-900 rounded-full hover:scale-105 animate-pulse ring-4 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all"
          title="Dismiss alarm"
        >
          <Square size={28} className="fill-current" />
        </button>
      </div>
    );
  }

  if (awaitingChoice) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 mt-12">
          <div className="flex items-center gap-4">
            <button
              onClick={continueStudy}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-zinc-900 font-medium hover:scale-105 transition-all"
            >
              <Play size={18} className="fill-current" />
              Continue
            </button>
            <button
              onClick={proceedToRest}
              disabled={elapsedSeconds <= 0}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500/90 text-white font-medium hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100"
            >
              <Coffee size={18} />
              Proceed to rest
            </button>
          </div>
          <button
            onClick={reset}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Reset"
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
      <div className="flex items-center gap-6 mt-12">
        <button
          onClick={reset}
          className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="Reset"
        >
          <RotateCcw size={24} />
        </button>
        <button
          onClick={skipRest}
          className="flex items-center justify-center gap-2 px-8 h-20 bg-white text-gray-900 rounded-full hover:scale-105 transition-all"
          title="Skip rest"
        >
          <SkipForward size={28} />
          <span className="font-medium pr-2">Skip rest</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-6 mt-12">
        <button
          onClick={reset}
          className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="Reset"
        >
          <RotateCcw size={24} />
        </button>

        <button
          onClick={isActive ? stopStudy : handleStart}
          className="flex items-center justify-center w-20 h-20 bg-white text-gray-900 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all"
        >
          {isActive ? (
            <Square size={28} className="fill-current" />
          ) : (
            <Play size={32} className="fill-current ml-2" />
          )}
        </button>

        {/* spacer for symmetry with classic controls */}
        <div className="w-10 h-10" />
      </div>

      <SessionConflictDialog
        open={showConflict}
        onConfirm={handleConfirmConflict}
        onCancel={() => setShowConflict(false)}
      />
    </>
  );
}
