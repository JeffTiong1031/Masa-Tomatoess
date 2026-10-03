import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaE76, hueDistance } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const MIN_BAR_CONTRAST = 3;
const MIN_SEPARATION = 20;
const MAX_HUE_DRIFT = 5;

function readToken(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return match![1];
}

function moodBlock(mood: 'light' | 'dark'): string {
  const blocks = CSS.split(`[data-mood='${mood}'] {`).slice(1);
  return blocks
    .map((block) => block.slice(0, block.indexOf('}')))
    .find((block) => block.includes('--mt-accent-meals-deep'))!;
}

describe('budget bar colours', () => {
  const calm = readToken('--mac-accent-finance-deep');
  const warn = readToken('--mac-budget-warn');
  const over = readToken('--mac-danger-deep');
  const surfaces = {
    white: readToken('--mac-white'),
    cream: readToken('--mac-cream'),
    track: readToken('--mac-border-light'),
  };

  it('pins the calm fill', () => {
    expect(calm).toBe('#4F7EBD');
  });

  it('pins the warning fill', () => {
    expect(warn).toBe('#9C772C');
  });

  it.each([
    ['calm', calm],
    ['warning', warn],
    ['over', over],
  ])('reads the %s fill as a bar on every surface it can sit on', (_, fill) => {
    for (const [surface, hex] of Object.entries(surfaces)) {
      expect(
        contrastRatio(fill, hex),
        `${fill} on ${surface}`,
      ).toBeGreaterThanOrEqual(MIN_BAR_CONTRAST);
    }
  });

  it('takes the calm fill from the finance accent, deeper', () => {
    const accent = readToken('--mac-accent-finance');
    expect(hueDistance(accent, calm)).toBeLessThanOrEqual(MAX_HUE_DRIFT);
    expect(deltaE76(accent, calm)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it('takes the warning fill from the flexible accent, deeper', () => {
    const accent = readToken('--mac-accent-flexible');
    expect(hueDistance(accent, warn)).toBeLessThanOrEqual(MAX_HUE_DRIFT);
    expect(deltaE76(accent, warn)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it('keeps the three fills apart from each other', () => {
    expect(deltaE76(calm, warn)).toBeGreaterThanOrEqual(MIN_SEPARATION);
    expect(deltaE76(calm, over)).toBeGreaterThanOrEqual(MIN_SEPARATION);
    expect(deltaE76(warn, over)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it.each(['light', 'dark'] as const)(
    'wires the %s mood tokens beside the meals deep shade',
    (mood) => {
      const block = moodBlock(mood);
      expect(block).toContain('--mt-budget-calm: var(--mac-accent-finance-deep);');
      expect(block).toContain('--mt-budget-warn: var(--mac-budget-warn);');
      expect(block).toContain('--mt-budget-over: var(--mt-danger);');
    },
  );
});
