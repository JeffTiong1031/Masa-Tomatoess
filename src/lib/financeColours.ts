import type { ColourSwatch } from './colourPalette';
import type { Category } from './finance';

export const SAVING_FILL = 'var(--mt-budget-calm)';
export const UNPAINTED_FILL = 'var(--mt-text-muted)';

function fillOf(category: Category, paints: Map<string, string>): string {
  if (category.system === 'saving') return SAVING_FILL;
  if (category.swatchId === null) return UNPAINTED_FILL;
  return paints.get(category.swatchId) ?? UNPAINTED_FILL;
}

export function categoryFills(
  categories: Category[],
  swatches: ColourSwatch[],
): Map<string, string> {
  const paints = new Map(swatches.map((swatch) => [swatch.id, swatch.fill]));
  return new Map(categories.map((category) => [category.id, fillOf(category, paints)]));
}

export function suggestedSwatch(
  swatches: ColourSwatch[],
  categories: Category[],
): string | null {
  const uses = new Map(swatches.map((swatch) => [swatch.id, 0]));
  for (const category of categories) {
    if (category.archived || category.swatchId === null) continue;
    const count = uses.get(category.swatchId);
    if (count !== undefined) uses.set(category.swatchId, count + 1);
  }
  let best: string | null = null;
  let fewest = Infinity;
  for (const [id, count] of uses) {
    if (count < fewest) {
      best = id;
      fewest = count;
    }
  }
  return best;
}
