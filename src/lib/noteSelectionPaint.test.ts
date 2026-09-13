import { describe, expect, it } from 'vitest';
import {
  NOTE_SELECTION_FILL,
  noteSelectionSlice,
} from './noteSelectionPaint';

describe('noteSelectionSlice', () => {
  it('does not paint a one-row highlight — the browser already does that', () => {
    expect(
      noteSelectionSlice({ index: 0, offset: 1 }, { index: 0, offset: 8 }, 0, 12),
    ).toBeNull();
  });

  it('stops on a word in the first and last row', () => {
    const start = { index: 0, offset: 3 };
    const end = { index: 2, offset: 5 };
    expect(noteSelectionSlice(start, end, 0, 10)).toEqual({
      start: 3,
      end: 10,
    });
    expect(noteSelectionSlice(start, end, 1, 8)).toEqual({ start: 0, end: 8 });
    expect(noteSelectionSlice(start, end, 2, 12)).toEqual({ start: 0, end: 5 });
    expect(noteSelectionSlice(start, end, 3, 6)).toBeNull();
  });

  it('skips a last row the caret only landed at the start of', () => {
    expect(
      noteSelectionSlice(
        { index: 0, offset: 2 },
        { index: 1, offset: 0 },
        1,
        9,
      ),
    ).toBeNull();
  });

  it('uses a pale system highlight, not a solid fill or the room accent', () => {
    expect(NOTE_SELECTION_FILL).toContain('Highlight');
    expect(NOTE_SELECTION_FILL).toContain('32%');
    expect(NOTE_SELECTION_FILL).not.toMatch(/accent|--mt-|--mac-/i);
    expect(NOTE_SELECTION_FILL).not.toBe('Highlight');
  });
});
