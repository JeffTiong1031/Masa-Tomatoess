import { describe, expect, it } from 'vitest';
import type { ColourSwatch } from './colourPalette';
import type { Category } from './finance';
import { SAVING_FILL, UNPAINTED_FILL, categoryFills, suggestedSwatch } from './financeColours';

function swatch(id: string, fill: string, position: number): ColourSwatch {
  return { id, owner: 'Jeff', kind: 'finance', fill, textColor: null, position };
}

function category(id: string, swatchId: string | null, archived = false): Category {
  return { id, kind: 'expense', name: id, system: null, archived, swatchId };
}

const swatches = [swatch('red', '#B83A3A', 0), swatch('green', '#4F7A2A', 1), swatch('blue', '#2C5FA8', 2)];

describe('categoryFills', () => {
  it('paints each category with the fill of its chosen colour', () => {
    const fills = categoryFills([category('food', 'green'), category('rent', 'red')], swatches);
    expect(fills.get('food')).toBe('#4F7A2A');
    expect(fills.get('rent')).toBe('#B83A3A');
  });

  it('gives Saving its fixed colour whatever it points at', () => {
    const saving: Category = {
      id: 'saving',
      kind: 'income',
      name: 'Saving',
      system: 'saving',
      archived: false,
      swatchId: null,
    };
    expect(categoryFills([saving], swatches).get('saving')).toBe(SAVING_FILL);
  });

  it('falls back to a neutral fill when no colour is chosen or the palette did not load', () => {
    const fills = categoryFills([category('food', null), category('rent', 'red')], []);
    expect(fills.get('food')).toBe(UNPAINTED_FILL);
    expect(fills.get('rent')).toBe(UNPAINTED_FILL);
  });
});

describe('suggestedSwatch', () => {
  it('offers the first colour no live category uses yet', () => {
    expect(suggestedSwatch(swatches, [category('food', 'red')])).toBe('green');
  });

  it('frees up the colour of a deleted category', () => {
    expect(suggestedSwatch(swatches, [category('food', 'red', true)])).toBe('red');
  });

  it('offers the least used colour once every colour is taken', () => {
    const categories = [
      category('a', 'red'),
      category('b', 'red'),
      category('c', 'green'),
      category('d', 'blue'),
      category('e', 'green'),
    ];
    expect(suggestedSwatch(swatches, categories)).toBe('blue');
  });

  it('has nothing to offer from an empty palette', () => {
    expect(suggestedSwatch([], [category('food', 'red')])).toBeNull();
  });
});
