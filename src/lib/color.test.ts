import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  hue,
  hueDistance,
  lightness,
  relativeLuminance,
} from './color';

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#C4B0E0', '#C4B0E0')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#241C22', '#F7EFEA')).toBeCloseTo(
      contrastRatio('#F7EFEA', '#241C22'),
      5,
    );
  });
});

describe('hue', () => {
  it('reads the primaries', () => {
    expect(hue('#FF0000')).toBeCloseTo(0, 1);
    expect(hue('#00FF00')).toBeCloseTo(120, 1);
    expect(hue('#0000FF')).toBeCloseTo(240, 1);
  });
});

describe('hueDistance', () => {
  it('measures the short way around the wheel', () => {
    // 350 deg and 10 deg are 20 apart, not 340.
    expect(hueDistance('#FF0D3D', '#FF3D0D')).toBeLessThan(45);
    expect(hueDistance('#FF0000', '#00FF00')).toBeCloseTo(120, 1);
  });

  it('never exceeds 180', () => {
    expect(hueDistance('#FF0000', '#00FFFF')).toBeLessThanOrEqual(180);
  });
});

describe('lightness', () => {
  it('spans 0 to 100', () => {
    expect(lightness('#000000')).toBeCloseTo(0, 1);
    expect(lightness('#FFFFFF')).toBeCloseTo(100, 1);
  });

  it('orders a ramp monotonically', () => {
    const ramp = ['#40333E', '#614A70', '#846597', '#A784BB', '#C4B0E0'];
    const ls = ramp.map(lightness);
    for (let i = 1; i < ls.length; i += 1) {
      expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    }
  });
});

describe('input validation', () => {
  it('rejects malformed hex', () => {
    expect(() => hue('nope')).toThrow();
    expect(() => hue('#FFF')).toThrow();
  });
});
