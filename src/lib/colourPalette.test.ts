import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  STARTER_FILLS,
  applyTextUpdateAll,
  canDeleteSwatch,
  isHexColor,
  legacyIndexToStarterPosition,
  resolveTimetablePaint,
  starterDrafts,
} from './colourPalette';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

function tagHex(n: number): string {
  const m = CSS.match(new RegExp(`--mac-tag-${n}:\\s*(#[0-9A-Fa-f]{6})`));
  if (m === null) throw new Error(`missing --mac-tag-${n}`);
  return m[1];
}

describe('STARTER_FILLS', () => {
  it('matches all eight --mac-tag fills in order', () => {
    expect(STARTER_FILLS).toHaveLength(8);
    for (let i = 0; i < 8; i += 1) {
      expect(STARTER_FILLS[i].toUpperCase()).toBe(tagHex(i + 1).toUpperCase());
    }
  });
});

describe('isHexColor', () => {
  it('accepts #RRGGBB', () => {
    expect(isHexColor('#FFFFFF')).toBe(true);
    expect(isHexColor('#b83a3a')).toBe(true);
  });

  it('rejects short or bare values', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('FFFFFF')).toBe(false);
  });
});

describe('starterDrafts', () => {
  it('gives timetable starters white text', () => {
    for (const draft of starterDrafts('timetable')) {
      expect(draft.textColor).toBe('#FFFFFF');
      expect(draft.kind).toBe('timetable');
    }
  });

  it('gives calendar starters null text', () => {
    for (const draft of starterDrafts('calendar')) {
      expect(draft.textColor).toBeNull();
      expect(draft.kind).toBe('calendar');
    }
  });
});

describe('resolveTimetablePaint', () => {
  const swatch = {
    id: 's1',
    owner: 'Jeff',
    kind: 'timetable' as const,
    fill: '#B83A3A',
    textColor: '#FFFFFF',
    position: 0,
  };

  it('uses the swatch text when override is null', () => {
    expect(resolveTimetablePaint(swatch, null)).toEqual({
      fill: '#B83A3A',
      text: '#FFFFFF',
    });
  });

  it('uses the override when present', () => {
    expect(resolveTimetablePaint(swatch, '#3B2E2A').text).toBe('#3B2E2A');
  });
});

describe('canDeleteSwatch', () => {
  it('allows when unused', () => {
    expect(canDeleteSwatch('a', ['b'])).toBe(true);
  });

  it('refuses when used', () => {
    expect(canDeleteSwatch('a', ['a', 'b'])).toBe(false);
  });
});

describe('applyTextUpdateAll', () => {
  it('updates the swatch and clears overrides that matched the old default', () => {
    const swatch = {
      id: 's1',
      owner: 'Jeff',
      kind: 'timetable' as const,
      fill: '#B83A3A',
      textColor: '#FFFFFF',
      position: 0,
    };
    const result = applyTextUpdateAll(swatch, '#3B2E2A', [
      { id: 'r1', swatchId: 's1', textOverride: null },
      { id: 'r2', swatchId: 's1', textOverride: '#FFFFFF' },
      { id: 'r3', swatchId: 's1', textOverride: '#000000' },
      { id: 'r4', swatchId: 'other', textOverride: '#FFFFFF' },
    ]);
    expect(result.swatch.textColor).toBe('#3B2E2A');
    expect(result.rulePatches.map((p) => p.id).sort()).toEqual(['r2']);
  });
});

describe('legacyIndexToStarterPosition', () => {
  it('maps 1..8 to 0..7', () => {
    expect(legacyIndexToStarterPosition(1)).toBe(0);
    expect(legacyIndexToStarterPosition(8)).toBe(7);
  });

  it('returns null outside 1..8', () => {
    expect(legacyIndexToStarterPosition(0)).toBeNull();
    expect(legacyIndexToStarterPosition(9)).toBeNull();
  });
});
