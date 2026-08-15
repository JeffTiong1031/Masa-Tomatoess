import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { deltaE76, hueDistance } from './color';

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
 *  eye and are grandfathered — flexible/meals sit 11 deg and delta E
 *  17.2 apart, and dashboard/finance delta E 17.8, both of which would
 *  fail the thresholds below. */
const NEW_ACCENTS = ['calendar', 'timetable'];

/** The real guard. Below roughly this, two accent chips read as the same
 *  colour at icon size — which is what Timetable and Countdown did at
 *  36px in the drawer's Life group, sitting delta E 12.4 apart.
 *
 *  This threshold replaces hue separation as the binding constraint.
 *  Hue angle is not perceptual difference: it ignores lightness and
 *  chroma, so the old 20 deg floor passed the two worst pairs in the
 *  palette (calendar/dashboard 40.5 deg but delta E 12.7,
 *  timetable/countdown 22.8 deg but delta E 12.4) while the pair the
 *  comment above names as the bad case sat further apart at 17.2. */
const MIN_DELTA_E = 20;

/** Kept as a secondary check. A pair can clear delta E on lightness
 *  alone — two shades of the same hue — and still read as "the same
 *  colour, lighter", which is not what a section accent is for. */
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
    'keeps %s perceptually clear of every other accent',
    (name) => {
      const accents = readAccents();
      const subject = accents[name];
      expect(subject, `--mac-accent-${name} is missing`).toBeDefined();

      for (const [other, hex] of Object.entries(accents)) {
        if (other === name) continue;
        const difference = deltaE76(subject, hex);
        expect(
          difference,
          `${name} (${subject}) is only delta E ${difference.toFixed(1)} from ${other} (${hex})`,
        ).toBeGreaterThanOrEqual(MIN_DELTA_E);
      }
    },
  );

  it.each(NEW_ACCENTS)('keeps %s clear of every other accent by hue', (name) => {
    const accents = readAccents();
    const subject = accents[name];

    for (const [other, hex] of Object.entries(accents)) {
      if (other === name) continue;
      const separation = hueDistance(subject, hex);
      expect(
        separation,
        `${name} (${subject}) is only ${separation.toFixed(1)} deg from ${other} (${hex})`,
      ).toBeGreaterThanOrEqual(MIN_HUE_SEPARATION_DEG);
    }
  });

  it('leaves the two new accents no worse than the grandfathered pairs', () => {
    // The point of the floor: before this, the two new accents were the
    // two CLOSEST pairs in the palette -- closer than flexible/meals,
    // the pair the threshold comment itself named as the bad case. The
    // closest pair overall must now be one of the grandfathered ones.
    const accents = readAccents();
    const names = Object.keys(accents);

    let closest = { pair: '', difference: Infinity };
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const difference = deltaE76(accents[names[i]], accents[names[j]]);
        if (difference < closest.difference) {
          closest = { pair: `${names[i]}/${names[j]}`, difference };
        }
      }
    }

    expect(
      NEW_ACCENTS.some((n) => closest.pair.split('/').includes(n)),
      `${closest.pair} is the closest pair at delta E ${closest.difference.toFixed(1)}, and it involves a new accent`,
    ).toBe(false);
  });
});
