import type { CalendarEvent } from './calendarEvent';

export interface Category {
  id: string;
  name: string;
  swatchId: string;
  position: number;
}

export interface CategoryDraft {
  name: string;
  swatchId: string;
}

export type CategoryError = 'nameRequired' | 'nameTaken' | 'swatchRequired';

export const CATEGORY_MESSAGES: Record<CategoryError, string> = {
  nameRequired: 'Give the category a name.',
  nameTaken: 'You already have a category with that name.',
  swatchRequired: 'Pick a colour.',
};

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

  if (draft.swatchId === '') return 'swatchRequired';

  return null;
}

export function affectedCount(
  events: CalendarEvent[],
  categoryId: string,
): number {
  return events.filter((event) => event.categoryId === categoryId).length;
}

export type CategoryView = Category & { fill: string };

export function withCategoryFills(
  categories: Category[],
  swatches: { id: string; fill: string }[],
): CategoryView[] {
  const fills = new Map(swatches.map((swatch) => [swatch.id, swatch.fill]));
  return categories.map((category) => ({
    ...category,
    fill: fills.get(category.swatchId) ?? 'var(--mt-text-muted)',
  }));
}
