import type { CalendarEvent } from './calendarEvent';

export type SwatchIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const SWATCHES: readonly { index: SwatchIndex; token: string }[] = [
  { index: 1, token: '--mt-tag-1' },
  { index: 2, token: '--mt-tag-2' },
  { index: 3, token: '--mt-tag-3' },
  { index: 4, token: '--mt-tag-4' },
  { index: 5, token: '--mt-tag-5' },
  { index: 6, token: '--mt-tag-6' },
  { index: 7, token: '--mt-tag-7' },
  { index: 8, token: '--mt-tag-8' },
] as const;

export interface Category {
  id: string;
  name: string;
  swatch: SwatchIndex;
  position: number;
}

export interface CategoryDraft {
  name: string;
  swatch: SwatchIndex;
}

export type CategoryError = 'nameRequired' | 'nameTaken' | 'swatchOutOfRange';

export const CATEGORY_MESSAGES: Record<CategoryError, string> = {
  nameRequired: 'Give the category a name.',
  nameTaken: 'You already have a category with that name.',
  swatchOutOfRange: 'Pick one of the colours shown.',
};

export function swatchToken(swatch: SwatchIndex): string {
  return `--mt-tag-${swatch}`;
}

export function validateCategory(
  draft: CategoryDraft,
  existing: Category[],
  editingId: string | null,
): CategoryError | null {
  const name = draft.name.trim();
  if (name === '') return 'nameRequired';

  const taken = existing.some(
    (category) =>
      category.id !== editingId &&
      category.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return 'nameTaken';

  const known = SWATCHES.some((swatch) => swatch.index === draft.swatch);
  if (!known) return 'swatchOutOfRange';

  return null;
}

export function affectedCount(
  events: CalendarEvent[],
  categoryId: string,
): number {
  return events.filter((event) => event.categoryId === categoryId).length;
}
