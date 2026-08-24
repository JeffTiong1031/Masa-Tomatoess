import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio, deltaE76, hueDistance } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const MIN_MARK_CONTRAST = 3;
const MIN_SEPARATION = 20;
const MAX_HUE_DRIFT = 5;

function readToken(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return match![1];
}

describe('week bar contrast', () => {
  const accent = readToken('--mac-accent-meals');
  const accentDeep = readToken('--mac-accent-meals-deep');
  const white = readToken('--mac-white');
  const cream = readToken('--mac-cream');

  it('pins the meals accent', () => {
    expect(accent).toBe('#D9AC80');
  });

  it('pins its deeper sibling', () => {
    expect(accentDeep).toBe('#8D7053');
  });

  it('reads as a bar fill on the card surface', () => {
    expect(contrastRatio(accentDeep, white)).toBeGreaterThanOrEqual(
      MIN_MARK_CONTRAST,
    );
  });

  it('reads as a bar fill on the page field too', () => {
    expect(contrastRatio(accentDeep, cream)).toBeGreaterThanOrEqual(
      MIN_MARK_CONTRAST,
    );
  });

  it('is a genuine deepening of the meals accent, not another hue', () => {
    expect(hueDistance(accent, accentDeep)).toBeLessThanOrEqual(MAX_HUE_DRIFT);
    expect(deltaE76(accent, accentDeep)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it('is not the calendar deep, which is what the bars used to render in', () => {
    expect(accentDeep).not.toBe(readToken('--mac-accent-calendar-deep'));
  });

  it('is wired to a semantic token for components to use', () => {
    expect(CSS).toContain('--mt-accent-meals-deep: var(--mac-accent-meals-deep);');
  });
});
