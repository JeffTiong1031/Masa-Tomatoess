'use client';

import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { useFlexibleStore } from '@/store/useFlexibleStore';

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TimerEngine() {
  const workerRef = useRef<Worker | null>(null);
  const classicActive = useTimerStore((s) => s.isActive);
  const classicTimeLeft = useTimerStore((s) => s.timeLeft);
  const flexibleActive = useFlexibleStore((s) => s.isActive);
  const flexiblePhase = useFlexibleStore((s) => s.phase);
  const flexibleElapsed = useFlexibleStore((s) => s.elapsedSeconds);
  const flexibleRestLeft = useFlexibleStore((s) => s.restTimeLeft);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../worker/timer.worker.ts', import.meta.url)
    );
    workerRef.current.onmessage = (e) => {
      if (e.data === 'TICK') {
        useTimerStore.getState().tick();
        useFlexibleStore.getState().tick();
      }
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (classicActive || flexibleActive) {
      workerRef.current?.postMessage({ command: 'START' });
    } else {
      workerRef.current?.postMessage({ command: 'STOP' });
    }
  }, [classicActive, flexibleActive]);

  useEffect(() => {
    if (flexibleActive || useFlexibleStore.getState().isFlexibleOngoing()) {
      if (flexiblePhase === 'rest') {
        document.title = `${formatClock(flexibleRestLeft)} - Flexible Rest`;
      } else if (flexibleActive || flexibleElapsed > 0) {
        document.title = `${formatClock(flexibleElapsed)} - Flexible Study`;
      }
      return;
    }
    if (classicActive || useTimerStore.getState().isClassicOngoing()) {
      document.title = `${formatClock(classicTimeLeft)} - Pomodoro OS`;
      return;
    }
    document.title = 'Masa Tomato';
  }, [
    classicActive,
    classicTimeLeft,
    flexibleActive,
    flexiblePhase,
    flexibleElapsed,
    flexibleRestLeft,
  ]);

  return null;
}
