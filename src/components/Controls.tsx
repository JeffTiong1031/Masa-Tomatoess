'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function Controls() {
  const { isActive, start, pause, skip, reset, tick, timeLeft, isAlarmRinging } = useTimerStore();
  const workerRef = useRef<Worker | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../worker/timer.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      if (e.data === 'TICK') {
        tick();
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [tick]);

  // Sync worker with isActive state
  useEffect(() => {
    if (isActive) {
      workerRef.current?.postMessage({ command: 'START' });
    } else {
      workerRef.current?.postMessage({ command: 'STOP' });
    }
  }, [isActive]);

  // Update document title when time changes
  useEffect(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    document.title = `${timeString} - Pomodoro OS`;
  }, [timeLeft]);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-6 mt-12">
      <button
        onClick={reset}
        className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
        title="Reset Timer"
      >
        <RotateCcw size={24} />
      </button>

      <button
        onClick={isActive ? pause : start}
        className={`flex items-center justify-center w-20 h-20 bg-white text-gray-900 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all ${
          isAlarmRinging ? 'animate-pulse ring-4 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : ''
        }`}
      >
        {isActive ? (
          <Pause size={32} className="fill-current" />
        ) : (
          <Play size={32} className="fill-current ml-2" />
        )}
      </button>

      <button
        onClick={skip}
        className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
        title="Skip Session"
      >
        <SkipForward size={24} />
      </button>
    </div>
  );
}
