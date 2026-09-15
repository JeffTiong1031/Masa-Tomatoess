import { describe, it, expect } from 'vitest';
import type { Note } from './note';
import { encodeBody } from './noteDoc';
import {
  countsByFolder,
  draftNotes,
  dragTagShift,
  dragTagTitle,
  filesFor,
  isNoteSort,
  notePreview,
  savedNotes,
  sortNotes,
  suggestedTitle,
} from './noteFiles';

function note(id: string, extra: Partial<Note> = {}): Note {
  return {
    id,
    owner: 'Jeff',
    title: id,
    body: '',
    sortOrder: 100,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    folderId: null,
    saved: true,
    binGroup: null,
    deletedAt: null,
    ...extra,
  };
}

describe('savedNotes and draftNotes', () => {
  it('splits files from drafts and leaves binned rows out of both', () => {
    const rows = [
      note('file'),
      note('draft', { saved: false }),
      note('binned', { deletedAt: '2026-09-15T00:00:00.000Z' }),
    ];

    expect(savedNotes(rows).map((n) => n.id)).toEqual(['file']);
    expect(draftNotes(rows).map((n) => n.id)).toEqual(['draft']);
  });
});

describe('sortNotes', () => {
  it('puts the newest touched first for recent', () => {
    const rows = [
      note('old', { updatedAt: '2026-09-01T00:00:00.000Z' }),
      note('new', { updatedAt: '2026-09-14T00:00:00.000Z' }),
    ];

    expect(sortNotes(rows, 'recent').map((n) => n.id)).toEqual(['new', 'old']);
  });

  it('sorts by name for name', () => {
    const rows = [note('b', { title: 'Banana' }), note('a', { title: 'Apple' })];

    expect(sortNotes(rows, 'name').map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('does not reorder the array it was given', () => {
    const rows = [
      note('old', { updatedAt: '2026-09-01T00:00:00.000Z' }),
      note('new', { updatedAt: '2026-09-14T00:00:00.000Z' }),
    ];
    sortNotes(rows, 'recent');

    expect(rows.map((n) => n.id)).toEqual(['old', 'new']);
  });
});

describe('filesFor', () => {
  const rows = [
    note('loose', { title: 'Loose' }),
    note('inRecipes', { title: 'Chicken rice', folderId: 'recipes' }),
    note('inUni', { title: 'Chicken anatomy', folderId: 'uni' }),
    note('draft', { title: 'Chicken draft', saved: false }),
  ];

  it('shows one folder at a time when not searching', () => {
    expect(filesFor(rows, 'recipes', 'recent', '').map((n) => n.id)).toEqual([
      'inRecipes',
    ]);
  });

  it('shows unfiled notes for the null folder', () => {
    expect(filesFor(rows, null, 'recent', '').map((n) => n.id)).toEqual([
      'loose',
    ]);
  });

  it('reaches across every folder while searching', () => {
    expect(
      filesFor(rows, 'recipes', 'name', 'chicken').map((n) => n.id),
    ).toEqual(['inUni', 'inRecipes']);
  });

  it('never turns up a draft', () => {
    expect(
      filesFor(rows, null, 'name', 'chicken').map((n) => n.id),
    ).not.toContain('draft');
  });

  it('ignores case and surrounding spaces in the query', () => {
    expect(filesFor(rows, null, 'name', '  RICE ').map((n) => n.id)).toEqual([
      'inRecipes',
    ]);
  });
});

describe('countsByFolder', () => {
  it('counts files per folder, drafts and binned rows excluded', () => {
    const counts = countsByFolder([
      note('a', { folderId: 'recipes' }),
      note('b', { folderId: 'recipes' }),
      note('c', { folderId: null }),
      note('d', { folderId: 'recipes', saved: false }),
      note('e', { folderId: 'recipes', deletedAt: '2026-09-15T00:00:00.000Z' }),
    ]);

    expect(counts.get('recipes')).toBe(2);
    expect(counts.get(null)).toBe(1);
  });
});

describe('notePreview', () => {
  it('keeps the tick state of checklist lines', () => {
    const body = encodeBody([
      { kind: 'paragraph', text: 'Shopping' },
      { kind: 'item', text: 'Eggs', checked: true, indent: 0 },
      { kind: 'item', text: 'Milk', checked: false, indent: 0 },
    ]);

    expect(notePreview(body)).toEqual([
      { text: 'Shopping', checked: null },
      { text: 'Eggs', checked: true },
      { text: 'Milk', checked: false },
    ]);
  });

  it('drops blank paragraphs but keeps an empty checklist line', () => {
    const body = encodeBody([
      { kind: 'paragraph', text: '' },
      { kind: 'paragraph', text: 'Words' },
      { kind: 'item', text: '', checked: false, indent: 0 },
    ]);

    expect(notePreview(body)).toEqual([
      { text: 'Words', checked: null },
      { text: '', checked: false },
    ]);
  });

  it('stops at the limit', () => {
    const body = encodeBody(
      ['one', 'two', 'three', 'four', 'five'].map((text) => ({
        kind: 'paragraph' as const,
        text,
      })),
    );

    expect(notePreview(body)).toHaveLength(4);
  });

  it('shows no private marks', () => {
    const body = encodeBody([
      { kind: 'item', text: 'Eggs', checked: true, indent: 2 },
    ]);

    expect(notePreview(body)[0].text).toBe('Eggs');
  });
});

describe('suggestedTitle', () => {
  it('uses the first line you typed', () => {
    const body = encodeBody([
      { kind: 'paragraph', text: 'Chicken rice' },
      { kind: 'paragraph', text: 'Ginger' },
    ]);

    expect(suggestedTitle(body)).toBe('Chicken rice');
  });

  it('is empty for an empty note', () => {
    expect(suggestedTitle('')).toBe('');
  });

  it('does not run past 60 characters', () => {
    const long = 'a'.repeat(200);
    expect(suggestedTitle(encodeBody([{ kind: 'paragraph', text: long }])))
      .toHaveLength(60);
  });
});

describe('dragTagTitle', () => {
  it('is null when nothing is being dragged', () => {
    expect(dragTagTitle([note('a', { title: '1st present' })], null)).toBe(
      null,
    );
  });

  it('is the note name while that note is dragged', () => {
    const rows = [
      note('a', { title: '1st present' }),
      note('b', { title: 'Week 2' }),
    ];

    expect(dragTagTitle(rows, 'a')).toBe('1st present');
  });

  it('is null when the dragged id is not a note', () => {
    expect(
      dragTagTitle([note('a', { title: '1st present' })], 'folder:x'),
    ).toBe(null);
  });
});

describe('dragTagShift', () => {
  const transform = { x: 40, y: 80, scaleX: 1, scaleY: 1 };

  it('leaves the move alone when there is no pointer yet', () => {
    expect(
      dragTagShift(transform, { left: 10, top: 20 }, null),
    ).toEqual(transform);
  });

  it('puts the tag by the finger, a little past it', () => {
    expect(
      dragTagShift(transform, { left: 10, top: 20 }, { x: 30, y: 50 }),
    ).toEqual({ x: 72, y: 122, scaleX: 1, scaleY: 1 });
  });
});

describe('isNoteSort', () => {
  it('accepts only the two sorts', () => {
    expect(isNoteSort('recent')).toBe(true);
    expect(isNoteSort('name')).toBe(true);
    expect(isNoteSort('size')).toBe(false);
  });
});
