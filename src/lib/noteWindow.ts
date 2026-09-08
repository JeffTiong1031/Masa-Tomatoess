export interface NoteWindowBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const NOTE_WINDOW_MIN_WIDTH = 280;
export const NOTE_WINDOW_MIN_HEIGHT = 220;
export const NOTE_WINDOW_DEFAULT_WIDTH = 360;
export const NOTE_WINDOW_DEFAULT_HEIGHT = 420;

export function defaultNoteWindow(viewW: number, viewH: number): NoteWindowBox {
  return clampNoteWindow(
    {
      x: viewW - NOTE_WINDOW_DEFAULT_WIDTH - 24,
      y: 72,
      width: NOTE_WINDOW_DEFAULT_WIDTH,
      height: NOTE_WINDOW_DEFAULT_HEIGHT,
    },
    viewW,
    viewH,
  );
}

export function clampNoteWindow(
  box: NoteWindowBox,
  viewW: number,
  viewH: number,
): NoteWindowBox {
  const width = Math.min(viewW, Math.max(NOTE_WINDOW_MIN_WIDTH, box.width));
  const height = Math.min(viewH, Math.max(NOTE_WINDOW_MIN_HEIGHT, box.height));
  const x = Math.min(Math.max(0, box.x), Math.max(0, viewW - width));
  const y = Math.min(Math.max(0, box.y), Math.max(0, viewH - height));
  return { x, y, width, height };
}
