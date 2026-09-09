import { describe, expect, it } from 'vitest';
import {
  canIndent,
  canOutdent,
  familyEnd,
  indentSelection,
  outdentSelection,
  selectedRoots,
  toggleChecked,
  toggleChecklist,
} from './noteEdit';
import type { Block } from './noteDoc';

const caret = { index: 0, offset: 0 };

const sample: Block[] = [
  { kind: 'paragraph', text: 'Above' },
  { kind: 'item', text: 'Parent', checked: false, indent: 0 },
  { kind: 'item', text: 'Child', checked: true, indent: 1 },
  { kind: 'paragraph', text: 'Below' },
];

describe('familyEnd', () => {
  it('includes nested items and stops at a sibling-or-shallower line', () => {
    expect(familyEnd(sample, 1)).toBe(2);
    expect(familyEnd(sample, 2)).toBe(2);
    expect(familyEnd(sample, 0)).toBe(0);
  });
});

describe('canIndent / canOutdent', () => {
  it('blocks indent deeper than one below the line above', () => {
    expect(canIndent(sample, 1)).toBe(false);
    expect(canIndent(sample, 2)).toBe(false);
    expect(canOutdent(sample, 1)).toBe(false);
    expect(canOutdent(sample, 2)).toBe(true);
  });
});

describe('selectedRoots', () => {
  it('excludes selected items whose ancestor is also selected', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'A1', checked: false, indent: 1 },
      { kind: 'item', text: 'A1a', checked: false, indent: 2 },
      { kind: 'item', text: 'B', checked: false, indent: 0 },
    ];

    expect(selectedRoots(blocks, 0, 3)).toEqual([0, 3]);
    expect(selectedRoots(blocks, 1, 3)).toEqual([1, 3]);
  });
});

describe('toggleChecked', () => {
  it('flips one item and leaves children alone', () => {
    const next = toggleChecked(sample, 1);
    expect(next[1]).toMatchObject({ kind: 'item', checked: true });
    expect(next[2]).toMatchObject({ kind: 'item', checked: true });
  });
});

describe('toggleChecklist', () => {
  it('converts every paragraph in the range to an unchecked item', () => {
    const next = toggleChecklist(sample, 0, 3, caret).blocks;
    expect(next[0]).toEqual({ kind: 'item', text: 'Above', checked: false, indent: 0 });
    expect(next[1]).toMatchObject({ kind: 'item', text: 'Parent' });
    expect(next[3]).toEqual({ kind: 'item', text: 'Below', checked: false, indent: 0 });
  });

  it('converts items back to paragraphs and shifts children out one step', () => {
    const listed: Block[] = [
      { kind: 'item', text: 'Parent', checked: true, indent: 0 },
      { kind: 'item', text: 'Child', checked: false, indent: 1 },
    ];
    const next = toggleChecklist(listed, 0, 0, caret).blocks;
    expect(next[0]).toEqual({ kind: 'paragraph', text: 'Parent' });
    expect(next[1]).toEqual({ kind: 'item', text: 'Child', checked: false, indent: 0 });
  });
});

describe('indentSelection', () => {
  it('moves the family together', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'B', checked: false, indent: 0 },
      { kind: 'item', text: 'B1', checked: true, indent: 1 },
    ];
    const next = indentSelection(nested, 1, 1, caret).blocks;
    expect(next[1]).toMatchObject({ indent: 1 });
    expect(next[2]).toMatchObject({ indent: 2, checked: true });
  });

  it('does not indent a child twice when the parent is also selected', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'A1', checked: false, indent: 1 },
    ];
    const next = indentSelection(nested, 0, 1, caret).blocks;
    expect(next[0]).toMatchObject({ indent: 1 });
    expect(next[1]).toMatchObject({ indent: 2 });
  });
});

describe('outdentSelection', () => {
  it('moves selected roots and their families out one step', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'A1', checked: false, indent: 1 },
      { kind: 'item', text: 'A1a', checked: true, indent: 2 },
    ];

    const result = outdentSelection(nested, 1, 2, caret);

    expect(result.blocks[1]).toMatchObject({ indent: 0 });
    expect(result.blocks[2]).toMatchObject({ indent: 1, checked: true });
    expect(result.caret).toBe(caret);
  });
});
