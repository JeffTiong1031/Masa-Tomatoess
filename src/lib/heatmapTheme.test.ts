import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { CHART_COLORS, HEATMAP_RAMP, HEATMAP_SURFACE } from './heatmapTheme';
import { contrastRatio, lightness } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

/** The declared value of a --mac-* token in globals.css. */
function readToken(name: string): string | undefined {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return match?.[1];
}

/** Below this, two adjacent levels read as the same swatch. The cream
 *  ramp failed here first time round with deltas of 1.115 to 1.445. */
const MIN_ADJACENT_CONTRAST = 1.25;

/** Spec §7 criterion 3: axis and tooltip text must clear AA against
 *  their own backgrounds. Nothing tested this until now. */
const MIN_TEXT_CONTRAST = 4.5;

/** A tooltip painted in the card's own colour reads as unpanelled
 *  floating text: a --mac-border-dark edge between two identical greys
 *  measures 1.282:1, which is not an edge. The floor is above that, so
 *  the panel's own fill has to do more work than the rim it replaced. */
const MIN_TOOLTIP_VS_CARD = 1.4;

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

  it('tops out on the dashboard accent', () => {
    expect(HEATMAP_RAMP[HEATMAP_RAMP.length - 1]).toBe(
      readToken('--mac-accent-dashboard'),
    );
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

/** Each literal the chart props consume, and the token it copies.
 *  Recharts and react-activity-calendar read these values before CSS
 *  custom properties resolve, so the literals are correct -- but nothing
 *  stopped a token being retuned underneath them, which would leave the
 *  chart (and every contrast assertion above) pinned to a colour that is
 *  no longer real. */
const TOKEN_FOR: Record<keyof typeof CHART_COLORS, string> = {
  axis: '--mac-shell-muted',
  border: '--mac-border-dark',
  surface: '--mac-plum-raised',
  tooltipBackground: '--mac-plum-elevated',
  tooltipText: '--mac-shell',
  bar: '--mac-accent-dashboard',
};

describe('chart colour drift', () => {
  it.each(Object.entries(TOKEN_FOR))(
    'CHART_COLORS.%s still equals %s',
    (key, token) => {
      const declared = readToken(token);
      expect(declared, `${token} is not declared in globals.css`).toBeDefined();
      expect(CHART_COLORS[key as keyof typeof CHART_COLORS]).toBe(declared);
    },
  );

  it('keeps HEATMAP_SURFACE on the card token', () => {
    expect(HEATMAP_SURFACE).toBe(readToken('--mac-plum-raised'));
  });
});

describe('chart text contrast (spec §7 criterion 3)', () => {
  it('clears AA for axis labels against the card', () => {
    const ratio = contrastRatio(CHART_COLORS.axis, CHART_COLORS.surface);
    expect(
      ratio,
      `axis ${CHART_COLORS.axis} is ${ratio.toFixed(2)}:1 on ${CHART_COLORS.surface}`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('clears AA for tooltip text against the tooltip', () => {
    const ratio = contrastRatio(
      CHART_COLORS.tooltipText,
      CHART_COLORS.tooltipBackground,
    );
    expect(
      ratio,
      `tooltip text ${CHART_COLORS.tooltipText} is ${ratio.toFixed(2)}:1 on ${CHART_COLORS.tooltipBackground}`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('gives the tooltip a real edge against the card it floats over', () => {
    const ratio = contrastRatio(CHART_COLORS.tooltipBackground, CHART_COLORS.surface);
    expect(
      ratio,
      `tooltip ${CHART_COLORS.tooltipBackground} is ${ratio.toFixed(3)}:1 against the card ${CHART_COLORS.surface}`,
    ).toBeGreaterThanOrEqual(MIN_TOOLTIP_VS_CARD);
  });
});
