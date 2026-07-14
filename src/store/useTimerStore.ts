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
  alarmSound: string;
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

  // Tagging & Analytics
  taskName: string;
  tagColor: string;
  interruptions: number;
  customColors: string[];

  // Drift-Free Engine
  targetEndTime: number | null;

  // Strict Mode
  strictMode: boolean;
  showStrictWarning: boolean;

  // Actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  setMode: (mode: TimerMode) => void;
  stopAlarm: () => void;

  // New Actions
  setTaskDetails: (name: string, color: string) => void;
  toggleStrictMode: () => void;
  clearStrictWarning: () => void;
  addCustomColor: (color: string) => void;
  updateCustomColor: (index: number, newColor: string) => void;
  clearCustomColors: () => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  cycleCount: 4,
  audioUrl: '',
  themeId: 'none',
  alarmSound: 'bell',
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

      taskName: '',
      tagColor: '#3b82f6',
      interruptions: 0,
      customColors: [],
      targetEndTime: null,
      strictMode: false,
      showStrictWarning: false,

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
          
          return { mode, timeLeft: nextTimeLeft, isActive: false, targetEndTime: null };
        }),

      start: () => {
        const state = get();
        if (state.isAlarmRinging) {
          get().skip();
          set({ 
            isAlarmRinging: false, 
            isActive: true,
            targetEndTime: Date.now() + get().timeLeft * 1000
          });
        } else {
          set({ 
            isActive: true,
            targetEndTime: Date.now() + state.timeLeft * 1000
          });
        }
      },
      pause: () => {
        const state = get();
        if (state.strictMode && state.mode === 'focus') {
          set({ 
            isActive: false, 
            timeLeft: state.settings.focusTime * 60,
            showStrictWarning: true,
            targetEndTime: null
          });
        } else {
          let nextTimeLeft = state.timeLeft;
          if (state.targetEndTime) {
            nextTimeLeft = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
          }
          const nextInterruptions = state.mode === 'focus' ? state.interruptions + 1 : state.interruptions;
          
          set({ 
            isActive: false, 
            timeLeft: nextTimeLeft,
            interruptions: nextInterruptions,
            targetEndTime: null
          });
        }
      },
      reset: () =>
        set((state) => {
          let nextTimeLeft = state.timeLeft;
          if (state.mode === 'focus') nextTimeLeft = state.settings.focusTime * 60;
          else if (state.mode === 'shortBreak') nextTimeLeft = state.settings.shortBreak * 60;
          else if (state.mode === 'longBreak') nextTimeLeft = state.settings.longBreak * 60;

          return { timeLeft: nextTimeLeft, isActive: false, isAlarmRinging: false, targetEndTime: null };
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
          if (!state.isActive || !state.targetEndTime) return state;

          const exactTimeLeft = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));

          if (exactTimeLeft > 0) {
            return { timeLeft: exactTimeLeft };
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
              completedAt: Date.now(),
              taskName: state.taskName,
              tagColor: state.tagColor,
              interruptions: state.interruptions
            }).catch(err => console.error("Failed to log session:", err));

            // ring alarm and pause
            return { 
              isAlarmRinging: true, 
              isActive: false,
              targetEndTime: null,
              interruptions: 0
            };
          }
        }),

      setTaskDetails: (name, color) => set({ taskName: name, tagColor: color }),
      toggleStrictMode: () => set((state) => ({ strictMode: !state.strictMode })),
      clearStrictWarning: () => set({ showStrictWarning: false }),
      addCustomColor: (color) => set((state) => {
        if (state.customColors.includes(color)) return state;
        if (state.customColors.length >= 4) return state;
        return { customColors: [...state.customColors, color] };
      }),
      updateCustomColor: (index, newColor) => set((state) => {
        const newColors = [...state.customColors];
        newColors[index] = newColor;
        return { customColors: newColors };
      }),
      clearCustomColors: () => set({ customColors: [] }),
    }),
    {
      name: 'pomodoro-settings',
      partialize: (state) => ({ 
        settings: state.settings,
        taskName: state.taskName,
        tagColor: state.tagColor,
        strictMode: state.strictMode,
        customColors: state.customColors
      }), 
    }
  )
);
