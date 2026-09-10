import { describe, it, expect } from 'vitest';
import { EMPTY_HISTORY, remember, undoTo, redoTo } from './noteHistory';
import type { NoteSnapshot } from './noteHistory';

const a: NoteSnapshot = {
  blocks: [{ kind: 'paragraph', text: 'A' }],
  caret: { index: 0, offset: 1 },
};
const b: NoteSnapshot = {
  blocks: [{ kind: 'item', text: 'A', checked: false, indent: 0 }],
  caret: { index: 0, offset: 1 },
};

describe('remember / undo / redo', () => {
  it('undoes one structural step and redoes it', () => {
    const remembered = remember(EMPTY_HISTORY, a);
    const undone = undoTo(remembered, b);
    expect(undone?.snapshot).toEqual(a);
    const redone = redoTo(undone!.history, undone!.snapshot);
    expect(redone?.snapshot).toEqual(b);
  });

  it('returns null when there is nothing to undo', () => {
    expect(undoTo(EMPTY_HISTORY, a)).toBe(null);
  });
});
