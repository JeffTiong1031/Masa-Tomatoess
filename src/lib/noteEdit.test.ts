import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  backspaceAtStart,
  canIndent,
  canOutdent,
  deleteSelection,
  enterAt,
  extendCaret,
  familyEnd,
  indentSelection,
  insertText,
  ordered,
  outdentSelection,
  typeOverRange,
  pasteExternal,
  pasteInternal,
  selectedRoots,
  toggleChecked,
  toggleChecklist,
} from './noteEdit';
import type { Block } from './noteDoc';

const EDITOR = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesEditor.tsx'),
  'utf8',
);

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
      { kind: 'item', text: 'P', checked: false, indent: 0 },
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'A1', checked: false, indent: 1 },
    ];
    const next = indentSelection(nested, 1, 2, caret).blocks;
    expect(next[1]).toMatchObject({ indent: 1 });
    expect(next[2]).toMatchObject({ indent: 2 });
  });

  it('does not indent a fully selected first family', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'A1', checked: false, indent: 1 },
    ];

    const next = indentSelection(nested, 0, 1, caret).blocks;

    expect(next[0]).toMatchObject({ indent: 0 });
    expect(next[1]).toMatchObject({ indent: 1 });
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

describe('enterAt', () => {
  it('creates an unchecked item below at the same indent', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'Hello', checked: true, indent: 1 },
    ];
    const next = enterAt(blocks, { index: 0, offset: 5 });
    expect(next.blocks[0]).toMatchObject({ text: 'Hello', checked: true });
    expect(next.blocks[1]).toEqual({
      kind: 'item',
      text: '',
      checked: false,
      indent: 1,
    });
    expect(next.caret).toEqual({ index: 1, offset: 0 });
  });

  it('splits in the middle and does not copy the tick', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'Hello', checked: true, indent: 0 },
    ];
    const next = enterAt(blocks, { index: 0, offset: 2 });
    expect(next.blocks[0]).toEqual({
      kind: 'item',
      text: 'He',
      checked: true,
      indent: 0,
    });
    expect(next.blocks[1]).toEqual({
      kind: 'item',
      text: 'llo',
      checked: false,
      indent: 0,
    });
  });

  it('outdents an empty nested item and exits an empty top-level item', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: '', checked: false, indent: 1 },
    ];
    expect(enterAt(nested, { index: 1, offset: 0 }).blocks[1]).toMatchObject({
      kind: 'item',
      indent: 0,
    });
    const top: Block[] = [{ kind: 'item', text: '', checked: false, indent: 0 }];
    expect(enterAt(top, { index: 0, offset: 0 }).blocks[0]).toEqual({
      kind: 'paragraph',
      text: '',
    });
  });
});

describe('backspaceAtStart', () => {
  it('outdents a nested item instead of turning it into a paragraph', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'B', checked: true, indent: 1 },
    ];
    const next = backspaceAtStart(blocks, { index: 1, offset: 0 });
    expect(next?.blocks[1]).toEqual({
      kind: 'item',
      text: 'B',
      checked: true,
      indent: 0,
    });
  });

  it('turns a top-level item into a paragraph and shifts children out', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'A', checked: true, indent: 0 },
      { kind: 'item', text: 'B', checked: false, indent: 1 },
    ];
    const next = backspaceAtStart(blocks, { index: 0, offset: 0 });
    expect(next?.blocks[0]).toEqual({ kind: 'paragraph', text: 'A' });
    expect(next?.blocks[1]).toMatchObject({ kind: 'item', indent: 0 });
  });
});

describe('deleteSelection', () => {
  it('keeps each remaining line type when a mixed selection is deleted', () => {
    const blocks: Block[] = [
      { kind: 'paragraph', text: 'Ab' },
      { kind: 'item', text: 'Cd', checked: true, indent: 0 },
    ];
    const next = deleteSelection(
      blocks,
      { index: 0, offset: 1 },
      { index: 1, offset: 1 },
    );
    expect(next.blocks).toEqual([
      { kind: 'paragraph', text: 'A' },
      { kind: 'item', text: 'd', checked: true, indent: 0 },
    ]);
    expect(next.caret).toEqual({ index: 0, offset: 1 });
  });

  it('drops an empty tail so Ctrl+A then type does not leave a husk', () => {
    const blocks: Block[] = [
      { kind: 'paragraph', text: 'Ab' },
      { kind: 'item', text: 'Cd', checked: true, indent: 0 },
    ];
    const next = deleteSelection(
      blocks,
      { index: 0, offset: 0 },
      { index: 1, offset: 2 },
    );
    expect(next.blocks).toEqual([{ kind: 'paragraph', text: '' }]);
    expect(next.caret).toEqual({ index: 0, offset: 0 });
  });
});

describe('typeOverRange', () => {
  it('inserts into the first remaining line and does not smash a mixed range', () => {
    const blocks: Block[] = [
      { kind: 'paragraph', text: 'Ab' },
      { kind: 'item', text: 'Cd', checked: true, indent: 0 },
    ];
    expect(
      typeOverRange(
        blocks,
        { index: 0, offset: 1 },
        { index: 1, offset: 1 },
        'x',
      ),
    ).toEqual({
      blocks: [
        { kind: 'paragraph', text: 'Ax' },
        { kind: 'item', text: 'd', checked: true, indent: 0 },
      ],
      caret: { index: 0, offset: 2 },
    });
  });

  it('replaces the whole note on the head line only', () => {
    const blocks: Block[] = [
      { kind: 'paragraph', text: 'Ab' },
      { kind: 'item', text: 'Cd', checked: true, indent: 0 },
    ];
    expect(
      typeOverRange(
        blocks,
        { index: 0, offset: 0 },
        { index: 1, offset: 2 },
        'x',
      ),
    ).toEqual({
      blocks: [{ kind: 'paragraph', text: 'x' }],
      caret: { index: 0, offset: 1 },
    });
  });
});

describe('extendCaret', () => {
  it('moves into the next line so a shift-arrow range can cover several blocks', () => {
    expect(extendCaret(sample, { index: 0, offset: 5 }, 'ArrowRight')).toEqual({
      index: 1,
      offset: 0,
    });
    expect(extendCaret(sample, { index: 0, offset: 5 }, 'ArrowDown')).toEqual({
      index: 1,
      offset: 5,
    });
  });
});

describe('the editor keeps a DocCaret range across blocks', () => {
  it('maps pointer drag to start/end and types over the range with typeOverRange', () => {
    expect(EDITOR).toContain('onPointerDown');
    expect(EDITOR).toContain('onPointerMove');
    expect(EDITOR).toContain('typeOverRange(');
    expect(EDITOR).toContain('extendCaret(');
  });

  it('uses extendCaret only while Shift is held, not for collapsed ArrowUp/Down', () => {
    expect(EDITOR).toContain('event.shiftKey && CARET_MOVES.has(event.key)');
    expect(EDITOR).not.toContain(
      'if (!ctrlOrMeta && CARET_MOVES.has(event.key))',
    );
  });

  it('captures mouse drags and leaves touch moves free to scroll', () => {
    expect(EDITOR).toContain("event.pointerType !== 'mouse'");
  });

  it('collapses a painted range to the focus caret on an unshifted arrow', () => {
    expect(EDITOR).toContain('!event.shiftKey && CARET_MOVES.has(event.key)');
    expect(EDITOR).toContain('applyRange(range.focus, range.focus)');
    expect(EDITOR).not.toContain(
      'if (!ctrlOrMeta && CARET_MOVES.has(event.key))',
    );
  });
});

describe('ordered', () => {
  it('orders carets by line and then offset', () => {
    const earlier = { index: 0, offset: 4 };
    const later = { index: 1, offset: 1 };

    expect(ordered(later, earlier)).toEqual([earlier, later]);
  });
});

describe('insertText', () => {
  it('inserts into an item without changing its tick or nesting', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'AB', checked: true, indent: 2 },
    ];

    expect(insertText(blocks, { index: 0, offset: 1 }, 'x')).toEqual({
      blocks: [{ kind: 'item', text: 'AxB', checked: true, indent: 2 }],
      caret: { index: 0, offset: 2 },
    });
  });

  it('restores the DOM caret after ordinary typing input', () => {
    expect(EDITOR).toContain('shouldRestoreCaretAfterTextCommit(');
  });
});

describe('pasteExternal', () => {
  it('joins into an item and does not create new items', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'AB', checked: true, indent: 1 },
    ];
    const next = pasteExternal(
      blocks,
      { index: 0, offset: 1 },
      { index: 0, offset: 1 },
      'x\ny',
    );
    expect(next.blocks).toEqual([
      { kind: 'item', text: 'Ax yB', checked: true, indent: 1 },
    ]);
  });
});

describe('pasteInternal', () => {
  it('keeps ticks and nesting when pasting a family inside the note', () => {
    const blocks: Block[] = [{ kind: 'paragraph', text: '' }];
    const fragment: Block[] = [
      { kind: 'item', text: 'P', checked: true, indent: 0 },
      { kind: 'item', text: 'C', checked: false, indent: 1 },
    ];
    const next = pasteInternal(
      blocks,
      { index: 0, offset: 0 },
      { index: 0, offset: 0 },
      fragment,
    );
    expect(next.blocks[0]).toMatchObject({
      kind: 'item',
      text: 'P',
      checked: true,
    });
    expect(next.blocks[1]).toMatchObject({
      kind: 'item',
      text: 'C',
      indent: 1,
    });
  });
});
