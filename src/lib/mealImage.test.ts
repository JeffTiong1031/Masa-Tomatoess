import { describe, expect, it } from 'vitest';
import { FULL_MAX_EDGE, THUMB_MAX_EDGE, fitWithin } from './mealImage';

describe('edge constants', () => {
  it('pins the full size at 800', () => {
    expect(FULL_MAX_EDGE).toBe(800);
  });

  it('pins the thumbnail at 200', () => {
    expect(THUMB_MAX_EDGE).toBe(200);
  });
});

describe('fitWithin', () => {
  it('shrinks a landscape photo by its width', () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks a portrait photo by its height', () => {
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 });
  });

  it('handles a square', () => {
    expect(fitWithin(2000, 2000, 200)).toEqual({ width: 200, height: 200 });
  });

  it('leaves an already small photo alone', () => {
    expect(fitWithin(640, 480, 800)).toEqual({ width: 640, height: 480 });
  });

  it('rounds to whole pixels', () => {
    expect(fitWithin(1000, 333, 800)).toEqual({ width: 800, height: 266 });
  });
});
