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

function completePictureInBlocks(
  blocks: Block[],
  pendingIndex: number,
  src: string,
): Block[] {
  if (pendingIndex < 0 || pendingIndex >= blocks.length) {
    return blocks;
  }
  const block = blocks[pendingIndex];
  switch (block.kind) {
    case 'picture': {
      if (block.src !== '') {
        return blocks;
      }
      const next = [...blocks];
      next[pendingIndex] = { ...block, src };
      return next;
    }
    case 'paragraph':
    case 'item':
      return blocks;
  }
}

export function completePendingPicture(
  history: NoteHistory,
  blocks: Block[],
  pendingIndex: number,
  src: string,
): { history: NoteHistory; blocks: Block[] } {
  const completeSnapshot = (snapshot: NoteSnapshot): NoteSnapshot => {
    const completed = completePictureInBlocks(
      snapshot.blocks,
      pendingIndex,
      src,
    );
    return completed === snapshot.blocks
      ? snapshot
      : { ...snapshot, blocks: completed };
  };
  return {
    history: {
      past: history.past.map(completeSnapshot),
      future: history.future.map(completeSnapshot),
    },
    blocks: completePictureInBlocks(blocks, pendingIndex, src),
  };
}

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
