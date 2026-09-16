import { describe, it, expect } from 'vitest';
import {
  completePendingPicture,
  EMPTY_HISTORY,
  remember,
  undoTo,
  redoTo,
} from './noteHistory';
import { defaultPicture } from './notePicture';
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

  it('completes a pending picture in history without restoring a deleted one', () => {
    const pending = defaultPicture('');
    const withPending: NoteSnapshot = {
      blocks: [{ kind: 'paragraph', text: 'A' }, pending],
      caret: { index: 1, offset: 0 },
    };
    const current = [{ kind: 'paragraph' as const, text: 'A' }];
    const completed = completePendingPicture(
      { past: [withPending], future: [withPending] },
      current,
      pending,
      'data:image/webp;base64,picture',
    );
    expect(completed.blocks).toBe(current);
    expect(completed.history.past[0].blocks[1]).toMatchObject({
      kind: 'picture',
      src: 'data:image/webp;base64,picture',
    });
    expect(completed.history.future[0].blocks[1]).toMatchObject({
      kind: 'picture',
      src: 'data:image/webp;base64,picture',
    });
  });
});
