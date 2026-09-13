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
export const NOTE_WINDOW_GRAB = 80;
export const NOTE_WINDOW_TITLE = 44;
export const NOTE_WINDOW_SLIVER = 8;

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

export type NoteWindowEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function clampNoteWindow(
  box: NoteWindowBox,
  viewW: number,
  viewH: number,
): NoteWindowBox {
  const width = Math.max(NOTE_WINDOW_MIN_WIDTH, box.width);
  const height = Math.max(NOTE_WINDOW_MIN_HEIGHT, box.height);
  const x = Math.min(
    Math.max(NOTE_WINDOW_GRAB - width, box.x),
    viewW - NOTE_WINDOW_GRAB,
  );
  const y = Math.min(
    Math.max(NOTE_WINDOW_SLIVER - NOTE_WINDOW_TITLE, box.y),
    viewH - NOTE_WINDOW_SLIVER,
  );
  return { x, y, width, height };
}

export function resizeNoteWindow(
  box: NoteWindowBox,
  edge: NoteWindowEdge,
  dx: number,
  dy: number,
  viewW: number,
  viewH: number,
): NoteWindowBox {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  let { x, y, width, height } = box;

  if (edge.includes('e')) {
    width = Math.max(NOTE_WINDOW_MIN_WIDTH, box.width + dx);
  }
  if (edge.includes('s')) {
    height = Math.max(NOTE_WINDOW_MIN_HEIGHT, box.height + dy);
  }
  if (edge.includes('w')) {
    x = Math.min(right - NOTE_WINDOW_MIN_WIDTH, box.x + dx);
    width = right - x;
  }
  if (edge.includes('n')) {
    y = Math.min(bottom - NOTE_WINDOW_MIN_HEIGHT, box.y + dy);
    height = bottom - y;
  }

  return clampNoteWindow({ x, y, width, height }, viewW, viewH);
}

export function restoreNoteWindowAtPointer(
  restored: NoteWindowBox,
  pointerX: number,
  pointerY: number,
  viewW: number,
  viewH: number,
): NoteWindowBox {
  return clampNoteWindow(
    {
      x: pointerX - restored.width / 2,
      y: pointerY - NOTE_WINDOW_TITLE / 2,
      width: restored.width,
      height: restored.height,
    },
    viewW,
    viewH,
  );
}
