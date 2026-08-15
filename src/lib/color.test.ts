import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  deltaE76,
  hexToLab,
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

describe('hexToLab', () => {
  // Published sRGB (D65, 2 deg observer) reference values. If the matrix
  // or the transfer function drifts, these move.
  it.each([
    ['#FFFFFF', 100.0, 0.0, 0.0],
    ['#000000', 0.0, 0.0, 0.0],
    ['#FF0000', 53.24, 80.09, 67.2],
    ['#00FF00', 87.73, -86.18, 83.18],
    ['#0000FF', 32.3, 79.19, -107.86],
  ])('converts %s', (hex, l, a, b) => {
    const lab = hexToLab(hex);
    expect(lab.l).toBeCloseTo(l, 1);
    expect(lab.a).toBeCloseTo(a, 1);
    expect(lab.b).toBeCloseTo(b, 1);
  });

  it('puts every neutral grey on the a*=b*=0 axis', () => {
    for (const grey of ['#333333', '#808080', '#CCCCCC']) {
      // 4dp, not more: the D65 white point is itself a rounded constant,
      // so a neutral lands within ~5e-6 of the axis rather than on it.
      expect(hexToLab(grey).a).toBeCloseTo(0, 4);
      expect(hexToLab(grey).b).toBeCloseTo(0, 4);
    }
  });
});

describe('deltaE76', () => {
  it('is 0 for a colour against itself', () => {
    expect(deltaE76('#C4B0E0', '#C4B0E0')).toBeCloseTo(0, 5);
  });

  it('is 100 for white against black', () => {
    expect(deltaE76('#FFFFFF', '#000000')).toBeCloseTo(100, 5);
  });

  it('is order-independent', () => {
    expect(deltaE76('#EF9A8D', '#A8DCD1')).toBeCloseTo(
      deltaE76('#A8DCD1', '#EF9A8D'),
      5,
    );
  });

  it('separates colours that hue angle calls identical', () => {
    // hue() collapses every achromatic colour to 0 deg, so mid grey reads
    // as pure red to hueDistance. This is why the accent palette is
    // guarded by delta E and not by hue separation alone.
    expect(hueDistance('#808080', '#FF0000')).toBe(0);
    expect(deltaE76('#808080', '#FF0000')).toBeGreaterThan(100);
  });

  it('calls two pale mint-cyans close even though their hues are far apart', () => {
    // The pair that motivated this: 22.8 deg apart, which cleared a
    // 20 deg floor, but only delta E 12.4 -- the closest pair in the
    // whole ten-colour palette.
    expect(hueDistance('#A8DCD1', '#9BD6E2')).toBeGreaterThan(20);
    expect(deltaE76('#A8DCD1', '#9BD6E2')).toBeLessThan(13);
  });
});

describe('input validation', () => {
  it('rejects malformed hex', () => {
    expect(() => hue('nope')).toThrow();
    expect(() => hue('#FFF')).toThrow();
  });
});
