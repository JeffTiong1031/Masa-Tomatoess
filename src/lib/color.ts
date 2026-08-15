/** Pure colour maths for verifying palette decisions in tests.
 *  Nothing here runs in the browser — it exists so that "these five
 *  levels are distinguishable" is an assertion instead of an opinion. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const n = Number.parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours. Always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Hue angle in degrees, 0-360. Greys return 0. */
export function hue(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;

  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** Shortest angular separation between two hues, 0-180. */
export function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/** CIE L* perceptual lightness, 0-100. Even L* steps read as an even
 *  ramp to the eye; even RGB steps do not. */
export function lightness(hex: string): number {
  const y = relativeLuminance(hex);
  return y <= 216 / 24389 ? y * (24389 / 27) : Math.cbrt(y) * 116 - 16;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

/** D65 white point, the reference sRGB is defined against. */
const D65 = { x: 0.95047, y: 1.0, z: 1.08883 };

/** CIE 1976 L*a*b*. L* is lightness, a* is green-to-red, b* is
 *  blue-to-yellow. Unlike hue angle it is an approximately uniform
 *  space, so a distance in it means something to the eye. */
export function hexToLab(hex: string): Lab {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // sRGB -> CIE XYZ (D65).
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;

  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : (t * (24389 / 27) + 16) / 116;
  const fx = f(x / D65.x);
  const fy = f(y / D65.y);
  const fz = f(z / D65.z);

  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIE76 colour difference: plain Euclidean distance in L*a*b*.
 *
 *  Prefer this to hueDistance when the question is "do these two read as
 *  the same colour". Hue angle ignores lightness and chroma entirely, so
 *  two swatches can sit 40 deg apart and still be near-identical to look
 *  at -- and hue() collapses every achromatic colour to 0, which makes a
 *  near-grey measure as pure red.
 *
 *  Rough scale: ~2.3 is the just-noticeable difference for large flat
 *  patches side by side; small chips seen apart need considerably more. */
export function deltaE76(a: string, b: string): number {
  const x = hexToLab(a);
  const y = hexToLab(b);
  return Math.sqrt((x.l - y.l) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2);
}
