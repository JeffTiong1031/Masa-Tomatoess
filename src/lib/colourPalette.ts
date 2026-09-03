export type PaletteKind = 'timetable' | 'calendar';

export interface ColourSwatch {
  id: string;
  owner: string;
  kind: PaletteKind;
  fill: string;
  textColor: string | null;
  position: number;
}

export const STARTER_FILLS: readonly string[] = [
  '#B83A3A',
  '#A05A12',
  '#4F7A2A',
  '#17706A',
  '#2C5FA8',
  '#5B3FA0',
  '#A63478',
  '#5A5560',
];

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function starterDrafts(
  kind: PaletteKind,
): Omit<ColourSwatch, 'id' | 'owner'>[] {
  return STARTER_FILLS.map((fill, position) => ({
    kind,
    fill,
    textColor: kind === 'timetable' ? '#FFFFFF' : null,
    position,
  }));
}

export function resolveTimetablePaint(
  swatch: ColourSwatch,
  textOverride: string | null,
): { fill: string; text: string } {
  return {
    fill: swatch.fill,
    text: textOverride ?? swatch.textColor ?? '#FFFFFF',
  };
}

export function canDeleteSwatch(
  swatchId: string,
  usedIds: readonly string[],
): boolean {
  return !usedIds.includes(swatchId);
}

export function applyTextUpdateAll(
  swatch: ColourSwatch,
  newText: string,
  rules: { id: string; swatchId: string; textOverride: string | null }[],
): {
  swatch: ColourSwatch;
  rulePatches: { id: string; textOverride: null }[];
} {
  const rulePatches: { id: string; textOverride: null }[] = rules
    .filter(
      (rule) =>
        rule.swatchId === swatch.id && rule.textOverride === swatch.textColor,
    )
    .map((rule) => ({ id: rule.id, textOverride: null }));

  return {
    swatch: { ...swatch, textColor: newText },
    rulePatches,
  };
}

export function legacyIndexToStarterPosition(swatch: number): number | null {
  if (swatch < 1 || swatch > 8) return null;
  return swatch - 1;
}
