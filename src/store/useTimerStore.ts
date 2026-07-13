import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/db';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focusTime: number; // in minutes
  shortBreak: number;
  longBreak: number;
  cycleCount: number;
  audioUrl: string;
  themeId: string;
}

interface TimerState {
  // Settings
  settings: TimerSettings;
  updateSettings: (newSettings: Partial<TimerSettings>) => void;

  // Active State
  mode: TimerMode;
  timeLeft: number; // in seconds
  isActive: boolean;
  isAlarmRinging: boolean;
  currentCycle: number; // starts at 1, goes up to cycleCount

  // Actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  setMode: (mode: TimerMode) => void;
  stopAlarm: () => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  cycleCount: 4,
  audioUrl: '',
  themeId: 'none',
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      mode: 'focus',
      timeLeft: DEFAULT_SETTINGS.focusTime * 60,
      isActive: false,
      isAlarmRinging: false,
      currentCycle: 1,

      updateSettings: (newSettings) =>
        set((state) => {
          const updatedSettings = { ...state.settings, ...newSettings };
          // If the timer isn't active, update the current time left based on the new settings for the current mode
          let newTimeLeft = state.timeLeft;
          if (!state.isActive) {
            if (state.mode === 'focus') newTimeLeft = updatedSettings.focusTime * 60;
            else if (state.mode === 'shortBreak') newTimeLeft = updatedSettings.shortBreak * 60;
            else if (state.mode === 'longBreak') newTimeLeft = updatedSettings.longBreak * 60;
          }
          return { settings: updatedSettings, timeLeft: newTimeLeft };
        }),

      setMode: (mode) =>
        set((state) => {
          let nextTimeLeft = state.timeLeft;
          if (mode === 'focus') nextTimeLeft = state.settings.focusTime * 60;
          else if (mode === 'shortBreak') nextTimeLeft = state.settings.shortBreak * 60;
          else if (mode === 'longBreak') nextTimeLeft = state.settings.longBreak * 60;
          
          return { mode, timeLeft: nextTimeLeft, isActive: false };
        }),

      start: () => {
        const state = get();
        if (state.isAlarmRinging) {
          get().skip();
          set({ isAlarmRinging: false, isActive: true });
        } else {
          set({ isActive: true });
        }
      },
      pause: () => set({ isActive: false }),
      reset: () =>
        set((state) => {
          let nextTimeLeft = state.timeLeft;
          if (state.mode === 'focus') nextTimeLeft = state.settings.focusTime * 60;
          else if (state.mode === 'shortBreak') nextTimeLeft = state.settings.shortBreak * 60;
          else if (state.mode === 'longBreak') nextTimeLeft = state.settings.longBreak * 60;

          return { timeLeft: nextTimeLeft, isActive: false, isAlarmRinging: false };
        }),
      
      stopAlarm: () => set({ isAlarmRinging: false }),

      skip: () => {
        set({ isAlarmRinging: false });
        const state = get();
        if (state.mode === 'focus') {
          // If we finished a focus session, check if it's time for a long break
          if (state.currentCycle >= state.settings.cycleCount) {
            get().setMode('longBreak');
          } else {
            get().setMode('shortBreak');
          }
        } else if (state.mode === 'shortBreak') {
          // After a short break, back to focus and increment cycle
          set({ currentCycle: state.currentCycle + 1 });
          get().setMode('focus');
        } else if (state.mode === 'longBreak') {
          // After a long break, reset cycle and back to focus
          set({ currentCycle: 1 });
          get().setMode('focus');
        }
      },

      tick: () =>
        set((state) => {
          if (!state.isActive) return state;

          if (state.timeLeft > 0) {
            return { timeLeft: state.timeLeft - 1 };
          } else {
            // Timer reached 0, strictly log the completed session
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const duration =
              state.mode === 'focus'
                ? state.settings.focusTime
                : state.mode === 'shortBreak'
                ? state.settings.shortBreak
                : state.settings.longBreak;
            
            db.sessions.add({
              date: dateStr,
              durationMinutes: duration,
              mode: state.mode,
              completedAt: Date.now()
            }).catch(err => console.error("Failed to log session:", err));

            // ring alarm and pause
            return { isAlarmRinging: true, isActive: false };
          }
        }),
    }),
    {
      name: 'pomodoro-settings',
      partialize: (state) => ({ settings: state.settings }), // Only persist settings
    }
  )
);
