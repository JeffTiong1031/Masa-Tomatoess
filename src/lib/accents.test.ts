import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { hueDistance } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

/** Every --mac-accent-* token declared in globals.css. */
function readAccents(): Record<string, string> {
  const found: Record<string, string> = {};
  const pattern = /--mac-accent-([a-z]+):\s*(#[0-9A-Fa-f]{6})/g;
  let match = pattern.exec(CSS);
  while (match !== null) {
    found[match[1]] = match[2];
    match = pattern.exec(CSS);
  }
  return found;
}

/** Accents added by this change. Pre-existing accents were approved by
 *  eye and are grandfathered — flexible and meals sit 11 deg apart and
 *  would fail the threshold below. */
const NEW_ACCENTS = ['calendar', 'timetable'];

/** Below roughly this, two accent chips read as the same colour at
 *  icon size. */
const MIN_HUE_SEPARATION_DEG = 20;

describe('accent palette', () => {
  it('declares all ten accents', () => {
    const accents = readAccents();
    expect(Object.keys(accents).sort()).toEqual([
      'calendar',
      'countdown',
      'cycle',
      'dashboard',
      'finance',
      'fitness',
      'flexible',
      'meals',
      'timer',
      'timetable',
    ]);
  });

  it.each(NEW_ACCENTS)(
    'keeps %s clear of every other accent',
    (name) => {
      const accents = readAccents();
      const subject = accents[name];
      expect(subject, `--mac-accent-${name} is missing`).toBeDefined();

      for (const [other, hex] of Object.entries(accents)) {
        if (other === name) continue;
        const separation = hueDistance(subject, hex);
        expect(
          separation,
          `${name} (${subject}) is only ${separation.toFixed(1)} deg from ${other} (${hex})`,
        ).toBeGreaterThanOrEqual(MIN_HUE_SEPARATION_DEG);
      }
    },
  );
});
