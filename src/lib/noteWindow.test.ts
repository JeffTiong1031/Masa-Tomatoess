import { describe, it, expect } from 'vitest';
import {
  NOTE_WINDOW_DEFAULT_HEIGHT,
  NOTE_WINDOW_DEFAULT_WIDTH,
  NOTE_WINDOW_MIN_HEIGHT,
  NOTE_WINDOW_MIN_WIDTH,
  clampNoteWindow,
  defaultNoteWindow,
} from './noteWindow';

describe('defaultNoteWindow', () => {
  it('sits middle-right with a size that still shows the page', () => {
    const box = defaultNoteWindow(1280, 800);
    expect(box.width).toBe(NOTE_WINDOW_DEFAULT_WIDTH);
    expect(box.height).toBe(NOTE_WINDOW_DEFAULT_HEIGHT);
    expect(box.x).toBe(1280 - NOTE_WINDOW_DEFAULT_WIDTH - 24);
    expect(box.y).toBe(72);
  });
});

describe('clampNoteWindow', () => {
  it('keeps a minimum size and stays on screen', () => {
    const box = clampNoteWindow(
      { x: -40, y: -20, width: 80, height: 80 },
      800,
      600,
    );
    expect(box.width).toBe(NOTE_WINDOW_MIN_WIDTH);
    expect(box.height).toBe(NOTE_WINDOW_MIN_HEIGHT);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(800);
    expect(box.y + box.height).toBeLessThanOrEqual(600);
  });
});
