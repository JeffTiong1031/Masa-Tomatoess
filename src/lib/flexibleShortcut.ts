import type { FlexiblePhase } from '@/store/useFlexibleStore';

const NATIVE_KEY_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

export type FlexibleKey = 'space' | 'enter';

export type FlexibleKeyAction =
  | 'start'
  | 'stop'
  | 'continue'
  | 'rest'
  | 'restart';

export interface FlexibleKeyState {
  phase: FlexiblePhase;
  isActive: boolean;
  awaitingChoice: boolean;
  isAlarmRinging: boolean;
  elapsedSeconds: number;
}

const KEYS: Record<string, FlexibleKey> = { ' ': 'space', Enter: 'enter' };

export function flexibleKeyFor(
  key: string,
  typing: boolean,
  tagName: string,
  hasModifier: boolean,
  overlayOpen: boolean,
  repeating: boolean,
): FlexibleKey | null {
  if (typing || hasModifier || overlayOpen || repeating) return null;
  if (NATIVE_KEY_TAGS.has(tagName)) return null;
  return KEYS[key] ?? null;
}

export function flexibleKeyAction(
  key: FlexibleKey,
  state: FlexibleKeyState,
): FlexibleKeyAction | null {
  const resting = state.isAlarmRinging || state.phase === 'rest';
  if (key === 'enter') {
    if (resting) return 'restart';
    if (state.awaitingChoice && state.elapsedSeconds > 0) return 'rest';
    return null;
  }
  if (resting) return null;
  if (state.isActive) return 'stop';
  if (state.awaitingChoice) return 'continue';
  return 'start';
}
