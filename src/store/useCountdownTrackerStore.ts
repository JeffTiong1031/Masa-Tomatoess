'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackerMode } from '@/lib/dayCount';

interface CountdownTrackerState {
  mode: TrackerMode;
  setMode: (mode: TrackerMode) => void;
}

export const useCountdownTrackerStore = create<CountdownTrackerState>()(
  persist(
    (set) => ({
      mode: 'countdown',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'mt-countdown-tracker',
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
