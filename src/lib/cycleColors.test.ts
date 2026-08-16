import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaE76, hexToRgb } from './color';
import { PHASE_LABELS, PHASE_VAR, TINT, phaseFill } from './cycleColors';
import type { Phase } from './cycle';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const PHASES: Phase[] = ['menstrual', 'follicular', 'fertile', 'luteal'];

const COCOA = '#3B2E2A';
const MIN_TEXT_CONTRAST = 4.5;
const MIN_SEPARATION = 20;

function readToken(name: string): string | undefined {
  return new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS)?.[1];
}

function mixWithWhite(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const blend = (channel: number) =>
    Math.round((channel * percent) / 100 + 255 * (1 - percent / 100));
  return `#${[blend(r), blend(g), blend(b)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('cycle phase tokens', () => {
  it('declares a raw hue for every phase', () => {
    for (const phase of PHASES) {
      expect(readToken(`--mac-cycle-${phase}`)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('points every semantic token at its raw hue in every mood block', () => {
    const blockCount = CSS.split('--mt-surface:').length - 1;
    expect(blockCount).toBeGreaterThanOrEqual(3);

    for (const phase of PHASES) {
      const mapping = `--mt-phase-${phase}: var(--mac-cycle-${phase})`;
      expect(CSS.split(mapping).length - 1).toBe(blockCount);
    }
  });

  it('references only semantic tokens from the module', () => {
    for (const phase of PHASES) {
      expect(PHASE_VAR[phase]).toBe(`var(--mt-phase-${phase})`);
      expect(CSS).toContain(`--mt-phase-${phase}:`);
    }
  });

  it('measures the light-mood surface and ink it assumes', () => {
    expect(readToken('--mac-white')).toBe('#FFFFFF');
    expect(readToken('--mac-cocoa')).toBe(COCOA);
    expect(CSS).toContain('--mt-surface: var(--mac-white)');
  });
});

describe('cycle phase separation', () => {
  it('keeps every pair of phases perceptually apart', () => {
    for (let i = 0; i < PHASES.length; i += 1) {
      for (let j = i + 1; j < PHASES.length; j += 1) {
        const a = readToken(`--mac-cycle-${PHASES[i]}`)!;
        const b = readToken(`--mac-cycle-${PHASES[j]}`)!;
        expect(deltaE76(a, b)).toBeGreaterThanOrEqual(MIN_SEPARATION);
      }
    }
  });
});

describe('cycle phase contrast', () => {
  it('keeps day numbers readable on every tint used, on the light-mood surface', () => {
    const tints = [TINT.period, TINT.phase, TINT.predicted, TINT.outOfMonth];
    for (const phase of PHASES) {
      const hue = readToken(`--mac-cycle-${phase}`)!;
      for (const tint of tints) {
        expect(contrastRatio(COCOA, mixWithWhite(hue, tint))).toBeGreaterThanOrEqual(
          MIN_TEXT_CONTRAST,
        );
      }
    }
  });

  it('keeps the recorded tint stronger than the predicted one', () => {
    expect(TINT.period).toBeGreaterThan(TINT.predicted);
    expect(TINT.phase).toBeGreaterThan(TINT.outOfMonth);
  });
});

describe('phaseFill and labels', () => {
  it('builds a colour-mix against the surface token', () => {
    expect(phaseFill('menstrual', 78)).toBe(
      'color-mix(in srgb, var(--mt-phase-menstrual) 78%, var(--mt-surface))',
    );
  });

  it('names every phase in plain English', () => {
    for (const phase of PHASES) {
      expect(PHASE_LABELS[phase].length).toBeGreaterThan(0);
    }
    expect(PHASE_LABELS.menstrual).toBe('Period');
  });
});
