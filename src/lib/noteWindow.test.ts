import { describe, it, expect } from 'vitest';
import {
  NOTE_WINDOW_DEFAULT_HEIGHT,
  NOTE_WINDOW_DEFAULT_WIDTH,
  NOTE_WINDOW_MIN_HEIGHT,
  NOTE_WINDOW_MIN_WIDTH,
  clampNoteWindow,
  defaultNoteWindow,
  resizeNoteWindow,
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

describe('resizeNoteWindow', () => {
  const start = { x: 200, y: 120, width: 360, height: 420 };

  it('grows the right and bottom edges without moving the origin', () => {
    const se = resizeNoteWindow(start, 'se', 40, 30, 1280, 800);
    expect(se).toEqual({ x: 200, y: 120, width: 400, height: 450 });
    const e = resizeNoteWindow(start, 'e', 40, 99, 1280, 800);
    expect(e).toEqual({ ...start, width: 400 });
    const s = resizeNoteWindow(start, 's', 99, 30, 1280, 800);
    expect(s).toEqual({ ...start, height: 450 });
  });

  it('grows the left and top edges by moving origin and keeping the far side', () => {
    const nw = resizeNoteWindow(start, 'nw', -20, -15, 1280, 800);
    expect(nw).toEqual({ x: 180, y: 105, width: 380, height: 435 });
    const w = resizeNoteWindow(start, 'w', -20, 50, 1280, 800);
    expect(w).toEqual({ x: 180, y: 120, width: 380, height: 420 });
    const n = resizeNoteWindow(start, 'n', 50, -15, 1280, 800);
    expect(n).toEqual({ x: 200, y: 105, width: 360, height: 435 });
  });

  it('pins the opposite edge when a side hits the minimum size', () => {
    const w = resizeNoteWindow(start, 'w', 200, 0, 1280, 800);
    expect(w.width).toBe(NOTE_WINDOW_MIN_WIDTH);
    expect(w.x + w.width).toBe(start.x + start.width);
    const n = resizeNoteWindow(start, 'n', 0, 400, 1280, 800);
    expect(n.height).toBe(NOTE_WINDOW_MIN_HEIGHT);
    expect(n.y + n.height).toBe(start.y + start.height);
  });

  it('does not leave the screen when an edge is dragged past it', () => {
    const w = resizeNoteWindow(start, 'w', -500, 0, 1280, 800);
    expect(w.x).toBe(0);
    expect(w.x + w.width).toBe(start.x + start.width);
    const e = resizeNoteWindow(start, 'e', 5000, 0, 1280, 800);
    expect(e.x).toBe(start.x);
    expect(e.x + e.width).toBe(1280);
  });
});
