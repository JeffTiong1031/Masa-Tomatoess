import { describe, expect, it } from 'vitest';
import { hexToHsv, hsvToHex } from './colourWheel';

const ROUND_TRIPS = ['#FF0000', '#FFFFFF', '#000000'] as const;

describe('hsvToHex(hexToHsv())', () => {
  it('round-trips #FF0000, #FFFFFF, and #000000', () => {
    for (const hex of ROUND_TRIPS) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});

describe('hexToHsv', () => {
  it('reads #FF0000 as red at full saturation and value', () => {
    expect(hexToHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 });
  });

  it('reads #FFFFFF as white', () => {
    expect(hexToHsv('#FFFFFF')).toEqual({ h: 0, s: 0, v: 1 });
  });

  it('reads #000000 as black', () => {
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
  });
});

describe('hsvToHex', () => {
  it('emits uppercase #RRGGBB', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000');
  });
});
