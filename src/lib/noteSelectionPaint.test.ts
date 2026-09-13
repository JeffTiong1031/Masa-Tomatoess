import { describe, expect, it } from 'vitest';
import {
  NOTE_SELECTION_FILL,
  noteSelectionCoversLine,
} from './noteSelectionPaint';

describe('noteSelectionCoversLine', () => {
  it('does not paint a one-row highlight — the browser already does that', () => {
    expect(noteSelectionCoversLine(0, 0, 0)).toBe(false);
    expect(noteSelectionCoversLine(2, 2, 2)).toBe(false);
  });

  it('paints every row a multi-row highlight covers, including the middle', () => {
    expect(noteSelectionCoversLine(0, 2, 0)).toBe(true);
    expect(noteSelectionCoversLine(0, 2, 1)).toBe(true);
    expect(noteSelectionCoversLine(0, 2, 2)).toBe(true);
    expect(noteSelectionCoversLine(0, 2, 3)).toBe(false);
  });

  it('uses the system highlight, not the room accent', () => {
    expect(NOTE_SELECTION_FILL).toBe('Highlight');
    expect(NOTE_SELECTION_FILL).not.toMatch(/accent|--mt-|--mac-/i);
  });
});
