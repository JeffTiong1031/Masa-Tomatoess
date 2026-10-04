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
      {/* Reset and Skip used to be bare icons sitting straight on the
          wallpaper. That was survivable while Focus was dark and they
          were white; under the light theme they became cocoa on an
          arbitrary photo, which is the collision that has to go. Each
          now rides its own glass disc, so contrast comes from the panel
          and not from whatever image happens to be underneath.

          Play stays unpanelled on purpose: it carries a solid accent
          fill, so it is already self-contained, and giving it a disc
          too would flatten the one element meant to dominate here. */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10">
        <button
          type="button"
          onClick={reset}
          className="min-h-12 min-w-12 inline-flex items-center justify-center rounded-full mt-glass text-[var(--mt-text-muted)] shadow-[0_4px_14px_rgba(0,0,0,0.10)] hover:text-[var(--mt-text)] transition-[color,transform,box-shadow] duration-150 active:scale-[0.92]"
          title="Reset Timer"
          aria-label="Reset timer"
        >
          <RotateCcw size={22} />
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className={`flex items-center justify-center min-h-20 min-w-20 bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)] rounded-full shadow-[0_8px_24px_color-mix(in_srgb,var(--mt-accent)_45%,transparent)] hover:scale-105 transition-[transform,box-shadow] duration-150 active:scale-[0.94] ${
            isAlarmRinging
              ? 'mt-pulse-safe animate-pulse ring-4 ring-[var(--mt-danger)]'
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
          className="min-h-12 min-w-12 inline-flex items-center justify-center rounded-full mt-glass text-[var(--mt-text-muted)] shadow-[0_4px_14px_rgba(0,0,0,0.10)] hover:text-[var(--mt-text)] transition-[color,transform,box-shadow] duration-150 active:scale-[0.92]"
          title="Skip Session"
          aria-label="Skip session"
        >
          <SkipForward size={22} />
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
