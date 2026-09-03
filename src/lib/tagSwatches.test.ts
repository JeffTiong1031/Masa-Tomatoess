import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio, deltaE76 } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const WHITE = '#FFFFFF';
const CREAM = '#FDF8F3';

const MIN_MARK_CONTRAST = 3;
const MIN_DELTA_E = 20;

function readSwatches(): string[] {
  const found: string[] = [];
  const pattern = /--mac-tag-(\d):\s*(#[0-9A-Fa-f]{6})/g;
  let match = pattern.exec(CSS);
  while (match !== null) {
    found[Number(match[1]) - 1] = match[2];
    match = pattern.exec(CSS);
  }
  return found;
}

describe('category swatches', () => {
  const swatches = readSwatches();

  it('declares a contiguous run of at least six', () => {
    expect(swatches.length).toBeGreaterThanOrEqual(6);
    expect(swatches.every((value) => typeof value === 'string')).toBe(true);
  });

  it('is aliased by a --mt-tag-N token for every --mac-tag-N', () => {
    for (let index = 1; index <= swatches.length; index += 1) {
      expect(CSS).toContain(`--mt-tag-${index}: var(--mac-tag-${index})`);
    }
  });

  it('clears 3:1 as a mark on both surfaces', () => {
    for (const swatch of swatches) {
      expect(contrastRatio(swatch, WHITE)).toBeGreaterThanOrEqual(
        MIN_MARK_CONTRAST,
      );
      expect(contrastRatio(swatch, CREAM)).toBeGreaterThanOrEqual(
        MIN_MARK_CONTRAST,
      );
    }
  });

  it('separates every pair by deltaE', () => {
    for (let a = 0; a < swatches.length; a += 1) {
      for (let b = a + 1; b < swatches.length; b += 1) {
        expect(deltaE76(swatches[a], swatches[b])).toBeGreaterThanOrEqual(
          MIN_DELTA_E,
        );
      }
    }
  });

  it('is distinct from every section accent', () => {
    const accents = /--mac-accent-[a-z]+:\s*(#[0-9A-Fa-f]{6})/g;
    const values: string[] = [];
    let match = accents.exec(CSS);
    while (match !== null) {
      values.push(match[1]);
      match = accents.exec(CSS);
    }
    for (const swatch of swatches) {
      for (const accent of values) {
        expect(deltaE76(swatch, accent)).toBeGreaterThan(10);
      }
    }
  });
});

const MIN_BLOCK_TEXT_CONTRAST = 4.5;

describe('swatches as timetable blocks', () => {
  const swatches = readSwatches();

  it('carries white body text on every swatch', () => {
    swatches.forEach((swatch, index) => {
      const ratio = contrastRatio(swatch, WHITE);
      expect(
        ratio,
        `--mac-tag-${index + 1} (${swatch}) behind white text`,
      ).toBeGreaterThanOrEqual(MIN_BLOCK_TEXT_CONTRAST);
    });
  });
});
