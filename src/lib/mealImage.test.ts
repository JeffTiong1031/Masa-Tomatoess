import { describe, expect, it } from 'vitest';
import { FULL_MAX_EDGE, THUMB_MAX_EDGE, fitWithin, toBase64 } from './mealImage';

function bytes(length: number): ArrayBuffer {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) out[i] = (i * 37 + 11) % 256;
  return out.buffer;
}

function expected(buffer: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buffer)).toString('base64');
}

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

describe('toBase64', () => {
  it('encodes an empty buffer', () => {
    expect(toBase64(bytes(0))).toBe('');
  });

  it('encodes a buffer smaller than one chunk', () => {
    const buffer = bytes(1000);
    expect(toBase64(buffer)).toBe(expected(buffer));
  });

  it('encodes an exact multiple of the chunk size', () => {
    const buffer = bytes(0x8000 * 2);
    expect(toBase64(buffer)).toBe(expected(buffer));
  });

  it('encodes one byte over a chunk boundary', () => {
    const buffer = bytes(0x8000 + 1);
    expect(toBase64(buffer)).toBe(expected(buffer));
  });

  it('encodes a photo-sized buffer without overflowing the call stack', () => {
    const buffer = bytes(400_000);
    expect(toBase64(buffer)).toBe(expected(buffer));
  });

  it('pads a length that is not a multiple of three', () => {
    expect(toBase64(bytes(1))).toHaveLength(4);
    expect(toBase64(bytes(2))).toHaveLength(4);
    expect(toBase64(bytes(3))).toHaveLength(4);
  });
});
