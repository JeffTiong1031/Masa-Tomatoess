import { FULL_MAX_EDGE } from './mealImage';
import type { PictureBlock } from './noteDoc';

export const NOTE_PIC_MAX_EDGE = FULL_MAX_EDGE;
export const NOTE_PIC_MIN_WIDTH = 0.15;

export function isPictureMime(type: string): boolean {
  return type.startsWith('image/');
}

export function defaultPicture(src: string): PictureBlock {
  return {
    kind: 'picture',
    sit: 'inline',
    width: 1,
    x: 0.5,
    y: 0.15,
    src,
  };
}

export function clampPictureWidth(width: number): number {
  return Math.min(1, Math.max(NOTE_PIC_MIN_WIDTH, width));
}

export function clampPlace(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function switchPictureSit(block: PictureBlock): PictureBlock {
  switch (block.sit) {
    case 'inline':
      return { ...block, sit: 'front' };
    case 'front':
      return { ...block, sit: 'inline' };
  }
}

export function sizePicture(block: PictureBlock, width: number): PictureBlock {
  return { ...block, width: clampPictureWidth(width) };
}

export function placePicture(
  block: PictureBlock,
  x: number,
  y: number,
): PictureBlock {
  return { ...block, x: clampPlace(x), y: clampPlace(y) };
}
