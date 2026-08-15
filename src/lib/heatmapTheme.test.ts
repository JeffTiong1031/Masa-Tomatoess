import { describe, it, expect } from 'vitest';
import { HEATMAP_RAMP, HEATMAP_SURFACE } from './heatmapTheme';
import { contrastRatio, lightness } from './color';

/** Below this, two adjacent levels read as the same swatch. The cream
 *  ramp failed here first time round with deltas of 1.115 to 1.445. */
const MIN_ADJACENT_CONTRAST = 1.25;

/** The empty level must be visible against the card it sits on, or the
 *  grid disappears -- but must still read as "nothing here". */
const MIN_EMPTY_VS_SURFACE = 1.15;

/** Largest L* step divided by smallest. Above this the ramp looks
 *  lumpy: some neighbours jump, others barely move. */
const MAX_STEP_UNEVENNESS = 1.8;

describe('dark heatmap ramp', () => {
  it('has five levels', () => {
    expect(HEATMAP_RAMP).toHaveLength(5);
  });

  it('separates every adjacent pair', () => {
    for (let i = 1; i < HEATMAP_RAMP.length; i += 1) {
      const ratio = contrastRatio(HEATMAP_RAMP[i - 1], HEATMAP_RAMP[i]);
      expect(
        ratio,
        `levels ${i - 1} and ${i} are only ${ratio.toFixed(3)}:1 apart`,
      ).toBeGreaterThanOrEqual(MIN_ADJACENT_CONTRAST);
    }
  });

  it('keeps the empty level visible against the card', () => {
    // Element 0 is the EMPTY / no-activity level, not the lowest value.
    const ratio = contrastRatio(HEATMAP_RAMP[0], HEATMAP_SURFACE);
    expect(
      ratio,
      `empty level ${HEATMAP_RAMP[0]} is ${ratio.toFixed(3)}:1 against the card`,
    ).toBeGreaterThanOrEqual(MIN_EMPTY_VS_SURFACE);
  });

  it('rises monotonically', () => {
    const ls = HEATMAP_RAMP.map(lightness);
    for (let i = 1; i < ls.length; i += 1) {
      expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    }
  });

  it('steps evenly in perceptual lightness', () => {
    const ls = HEATMAP_RAMP.map(lightness);
    const steps = ls.slice(1).map((l, i) => l - ls[i]);
    const unevenness = Math.max(...steps) / Math.min(...steps);
    expect(
      unevenness,
      `steps are ${steps.map((s) => s.toFixed(1)).join(', ')}`,
    ).toBeLessThanOrEqual(MAX_STEP_UNEVENNESS);
  });
});
