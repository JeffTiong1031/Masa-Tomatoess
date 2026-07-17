import { useTimerStore } from '@/store/useTimerStore';
import { useFlexibleStore } from '@/store/useFlexibleStore';

export type SessionOwner = 'classic' | 'flexible';

export function getBlockingOwner(): SessionOwner | null {
  const classicOngoing = useTimerStore.getState().isClassicOngoing();
  const flexibleOngoing = useFlexibleStore.getState().isFlexibleOngoing();

  if (classicOngoing && flexibleOngoing) {
    // Prefer whichever is actively ticking; otherwise classic
    if (useFlexibleStore.getState().isActive) return 'flexible';
    if (useTimerStore.getState().isActive) return 'classic';
    return 'classic';
  }
  if (classicOngoing) return 'classic';
  if (flexibleOngoing) return 'flexible';
  return null;
}

/**
 * Ends the blocking other-mode session (logging study/focus when appropriate),
 * then runs startFn for the target mode.
 */
export function resolveConflictAndStart(
  target: SessionOwner,
  startFn: () => void
): void {
  const blocker = getBlockingOwner();
  if (blocker && blocker !== target) {
    if (blocker === 'flexible') {
      const flex = useFlexibleStore.getState();
      if (flex.phase === 'rest') {
        flex.endWithoutLogging();
      } else {
        flex.endAndLogStudyIfAny();
      }
    } else {
      const classic = useTimerStore.getState();
      if (classic.mode === 'focus') {
        classic.endAndLogPartialFocus();
      } else {
        classic.hardResetToIdleFocus();
      }
    }
  }
  startFn();
}
