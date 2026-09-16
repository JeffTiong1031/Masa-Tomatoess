import { describe, expect, it } from 'vitest';
import { FULL_MAX_EDGE, fitWithin } from './mealImage';
import { emptyPicture } from './noteDoc';
import {
  NOTE_PIC_MAX_EDGE,
  clampPictureWidth,
  clampPlace,
  defaultPicture,
  isPictureMime,
  placePicture,
  sizePicture,
  switchPictureSit,
} from './notePicture';

describe('note picture shrink rule', () => {
  it('uses the same 800 long-side cap as meals', () => {
    expect(NOTE_PIC_MAX_EDGE).toBe(800);
    expect(NOTE_PIC_MAX_EDGE).toBe(FULL_MAX_EDGE);
  });

  it('leaves a smaller photo alone', () => {
    expect(fitWithin(640, 480, NOTE_PIC_MAX_EDGE)).toEqual({
      width: 640,
      height: 480,
    });
  });
});

describe('isPictureMime', () => {
  it('accepts image types and rejects the rest', () => {
    expect(isPictureMime('image/png')).toBe(true);
    expect(isPictureMime('image/webp')).toBe(true);
    expect(isPictureMime('text/plain')).toBe(false);
    expect(isPictureMime('application/pdf')).toBe(false);
  });
});

describe('sit and size', () => {
  it('defaults to in line, full width, last place remembered', () => {
    expect(defaultPicture('data:image/webp;base64,AAA')).toEqual({
      kind: 'picture',
      sit: 'inline',
      width: 1,
      x: 0.5,
      y: 0.15,
      src: 'data:image/webp;base64,AAA',
    });
  });

  it('switches in line to on top and back without losing place', () => {
    const placed = placePicture(defaultPicture('x'), 0.2, 0.7);
    const front = switchPictureSit(placed);
    expect(front.sit).toBe('front');
    expect(front.x).toBe(0.2);
    expect(front.y).toBe(0.7);
    expect(switchPictureSit(front)).toEqual(placed);
  });

  it('clamps width and place', () => {
    expect(clampPictureWidth(0)).toBe(0.15);
    expect(clampPictureWidth(2)).toBe(1);
    expect(clampPlace(-1)).toBe(0);
    expect(clampPlace(2)).toBe(1);
    expect(sizePicture(emptyPicture(), 0.4).width).toBe(0.4);
  });
});
