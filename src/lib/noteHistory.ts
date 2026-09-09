import type { DocCaret } from './noteEdit';
import type { Block } from './noteDoc';

export interface NoteSnapshot {
  blocks: Block[];
  caret: DocCaret;
}

export interface NoteHistory {
  past: NoteSnapshot[];
  future: NoteSnapshot[];
}

export const EMPTY_HISTORY: NoteHistory = { past: [], future: [] };

export function remember(
  history: NoteHistory,
  snapshot: NoteSnapshot,
): NoteHistory {
  return {
    past: [...history.past, snapshot],
    future: [],
  };
}

export function undoTo(
  history: NoteHistory,
  current: NoteSnapshot,
): { history: NoteHistory; snapshot: NoteSnapshot } | null {
  if (history.past.length === 0) {
    return null;
  }
  const past = [...history.past];
  const snapshot = past.pop()!;
  return {
    history: {
      past,
      future: [...history.future, current],
    },
    snapshot,
  };
}

export function redoTo(
  history: NoteHistory,
  current: NoteSnapshot,
): { history: NoteHistory; snapshot: NoteSnapshot } | null {
  if (history.future.length === 0) {
    return null;
  }
  const future = [...history.future];
  const snapshot = future.pop()!;
  return {
    history: {
      past: [...history.past, current],
      future,
    },
    snapshot,
  };
}
