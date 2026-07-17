import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/db';
import {
  clampRestRatio,
  computeRestSeconds,
  elapsedMinutesToLog,
} from '@/lib/flexibleTime';

export type FlexiblePhase = 'study' | 'rest';

interface FlexibleState {
  restRatio: number;
  phase: FlexiblePhase;
  elapsedSeconds: number;
  baseElapsedSeconds: number;
  restTimeLeft: number;
  isActive: boolean;
  isAlarmRinging: boolean;
  awaitingChoice: boolean;
  studyAnchorMs: number | null;
  restTargetEndTime: number | null;

  startStudy: () => void;
  stopStudy: () => void;
  continueStudy: () => void;
  proceedToRest: () => void;
  skipRest: () => void;
  reset: () => void;
  tick: () => void;
  stopAlarm: () => void;
  updateRestRatio: (ratio: number) => void;
  endWithoutLogging: () => void;
  endAndLogStudyIfAny: () => void;
  isFlexibleOngoing: () => boolean;
  getLiveElapsedSeconds: () => number;
}

const idleStudyState = {
  phase: 'study' as FlexiblePhase,
  elapsedSeconds: 0,
  baseElapsedSeconds: 0,
  restTimeLeft: 0,
  isActive: false,
  isAlarmRinging: false,
  awaitingChoice: false,
  studyAnchorMs: null as number | null,
  restTargetEndTime: null as number | null,
};

function logFlexibleFocus(durationMinutes: number) {
  import('@/store/useTimerStore').then(({ useTimerStore }) => {
    const { taskName, tagColor } = useTimerStore.getState();
    const dateStr = new Date().toISOString().split('T')[0];
    db.sessions
      .add({
        date: dateStr,
        durationMinutes,
        mode: 'focus',
        completedAt: Date.now(),
        taskName: taskName || undefined,
        tagColor: tagColor || undefined,
        synced: false,
        userName: localStorage.getItem('user_name') || undefined,
      })
      .then(() => {
        import('@/lib/sync').then(({ syncSessions }) => syncSessions());
      })
      .catch((err) => console.error('Failed to log flexible session:', err));
  });
}

export const useFlexibleStore = create<FlexibleState>()(
  persist(
    (set, get) => ({
      restRatio: 5,
      ...idleStudyState,

      getLiveElapsedSeconds: () => {
        const state = get();
        if (state.phase !== 'study') return state.elapsedSeconds;
        if (state.isActive && state.studyAnchorMs != null) {
          return (
            state.baseElapsedSeconds +
            Math.max(0, Math.floor((Date.now() - state.studyAnchorMs) / 1000))
          );
        }
        return state.elapsedSeconds;
      },

      isFlexibleOngoing: () => {
        const state = get();
        return (
          state.isActive ||
          state.isAlarmRinging ||
          state.awaitingChoice ||
          (state.phase === 'study' && state.elapsedSeconds > 0) ||
          state.phase === 'rest'
        );
      },

      updateRestRatio: (ratio) => set({ restRatio: clampRestRatio(ratio) }),

      startStudy: () => {
        const state = get();
        if (state.phase === 'rest' || state.isAlarmRinging) return;
        set({
          phase: 'study',
          isActive: true,
          awaitingChoice: false,
          isAlarmRinging: false,
          studyAnchorMs: Date.now(),
          baseElapsedSeconds: state.elapsedSeconds,
          restTargetEndTime: null,
        });
      },

      stopStudy: () => {
        const state = get();
        if (state.phase !== 'study' || !state.isActive) return;
        const elapsed = get().getLiveElapsedSeconds();
        set({
          isActive: false,
          studyAnchorMs: null,
          elapsedSeconds: elapsed,
          baseElapsedSeconds: elapsed,
          awaitingChoice: true,
        });
      },

      continueStudy: () => {
        const state = get();
        if (state.phase !== 'study' || !state.awaitingChoice) return;
        set({
          isActive: true,
          awaitingChoice: false,
          studyAnchorMs: Date.now(),
          baseElapsedSeconds: state.elapsedSeconds,
        });
      },

      proceedToRest: () => {
        const state = get();
        if (state.phase !== 'study' || !state.awaitingChoice) return;

        const elapsed = state.elapsedSeconds;
        const minutes = elapsedMinutesToLog(elapsed);
        if (minutes != null) {
          logFlexibleFocus(minutes);
        }

        const restSeconds = computeRestSeconds(elapsed, state.restRatio);
        if (restSeconds <= 0) {
          set({ ...idleStudyState, restRatio: state.restRatio });
          return;
        }

        set({
          phase: 'rest',
          isActive: true,
          awaitingChoice: false,
          isAlarmRinging: false,
          studyAnchorMs: null,
          elapsedSeconds: 0,
          baseElapsedSeconds: 0,
          restTimeLeft: restSeconds,
          restTargetEndTime: Date.now() + restSeconds * 1000,
        });
      },

      skipRest: () => {
        const state = get();
        if (state.phase !== 'rest') return;
        set({ ...idleStudyState, restRatio: state.restRatio });
      },

      reset: () => {
        const state = get();
        set({ ...idleStudyState, restRatio: state.restRatio });
      },

      stopAlarm: () => {
        const state = get();
        set({
          ...idleStudyState,
          restRatio: state.restRatio,
          isAlarmRinging: false,
        });
      },

      endWithoutLogging: () => {
        const state = get();
        set({ ...idleStudyState, restRatio: state.restRatio });
      },

      endAndLogStudyIfAny: () => {
        const state = get();
        if (state.phase === 'rest') {
          get().endWithoutLogging();
          return;
        }

        const elapsed =
          state.isActive || state.awaitingChoice || state.elapsedSeconds > 0
            ? get().getLiveElapsedSeconds()
            : 0;

        const minutes = elapsedMinutesToLog(elapsed);
        if (minutes != null) {
          logFlexibleFocus(minutes);
        }

        get().endWithoutLogging();
      },

      tick: () =>
        set((state) => {
          if (!state.isActive) return state;

          if (state.phase === 'study' && state.studyAnchorMs != null) {
            const elapsed =
              state.baseElapsedSeconds +
              Math.max(0, Math.floor((Date.now() - state.studyAnchorMs) / 1000));
            return { elapsedSeconds: elapsed };
          }

          if (state.phase === 'rest' && state.restTargetEndTime != null) {
            const exactTimeLeft = Math.max(
              0,
              Math.ceil((state.restTargetEndTime - Date.now()) / 1000)
            );
            if (exactTimeLeft > 0) {
              return { restTimeLeft: exactTimeLeft };
            }
            return {
              ...idleStudyState,
              restRatio: state.restRatio,
              isAlarmRinging: true,
            };
          }

          return state;
        }),
    }),
    {
      name: 'flexible-settings',
      partialize: (state) => ({ restRatio: state.restRatio }),
    }
  )
);
