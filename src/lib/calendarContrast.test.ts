import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToRgb } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const TINT = 0.32;
const MIN_BODY_CONTRAST = 4.5;
const MIN_MARK_CONTRAST = 3;

function readToken(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return match![1];
}

function pad(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function mix(over: string, under: string, ratio: number): string {
  const a = hexToRgb(over);
  const b = hexToRgb(under);
  const blend = (x: number, y: number) => Math.round(x * ratio + y * (1 - ratio));
  return `#${pad(blend(a.r, b.r))}${pad(blend(a.g, b.g))}${pad(blend(a.b, b.b))}`;
}

describe('event block contrast', () => {
  const accent = readToken('--mac-accent-calendar');
  const accentDeep = readToken('--mac-accent-calendar-deep');
  const white = readToken('--mac-white');
  const cocoa = readToken('--mac-cocoa');
  const cocoaMuted = readToken('--mac-cocoa-muted');
  const fill = mix(accent, white, TINT);

  it('clears AA for the event title on the tint', () => {
    expect(contrastRatio(cocoa, fill)).toBeGreaterThanOrEqual(MIN_BODY_CONTRAST);
  });

  it('clears AA for the time line on the tint', () => {
    expect(contrastRatio(cocoaMuted, fill)).toBeGreaterThanOrEqual(
      MIN_BODY_CONTRAST,
    );
  });

  it('keeps the outline visible for the partner treatment', () => {
    expect(contrastRatio(accentDeep, white)).toBeGreaterThanOrEqual(
      MIN_MARK_CONTRAST,
    );
  });

  it('keeps every swatch readable as a dot on the tint', () => {
    const pattern = /--mac-tag-\d:\s*(#[0-9A-Fa-f]{6})/g;
    let match = pattern.exec(CSS);
    while (match !== null) {
      expect(contrastRatio(match[1], fill)).toBeGreaterThanOrEqual(
        MIN_MARK_CONTRAST,
      );
      match = pattern.exec(CSS);
    }
  });
});
