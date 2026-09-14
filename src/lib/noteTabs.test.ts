import { describe, it, expect } from 'vitest';
import type { Note } from './note';
import {
  nextActiveId,
  openTabs,
  seedOpenIds,
  withOpen,
  withoutOpen,
} from './noteTabs';

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

describe('openTabs', () => {
  it('follows the order you opened them, not the order they are stored', () => {
    const notes = [note('a'), note('b'), note('c')];

    expect(openTabs(notes, ['c', 'a']).map((n) => n.id)).toEqual(['c', 'a']);
  });

  it('skips an id that resolves to nothing', () => {
    expect(openTabs([note('a')], ['a', 'missing']).map((n) => n.id)).toEqual([
      'a',
    ]);
  });

  it('skips a note that is in the bin', () => {
    const notes = [note('a'), note('gone', { deletedAt: '2026-09-15T00:00:00.000Z' })];

    expect(openTabs(notes, ['a', 'gone']).map((n) => n.id)).toEqual(['a']);
  });
});

describe('withOpen', () => {
  it('adds at the end', () => {
    expect(withOpen(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('does not open a second tab for a note already open', () => {
    expect(withOpen(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });
});

describe('withoutOpen', () => {
  it('removes every id given', () => {
    expect(withoutOpen(['a', 'b', 'c'], ['a', 'c'])).toEqual(['b']);
  });
});

describe('nextActiveId', () => {
  it('stays put when another tab closed', () => {
    expect(nextActiveId(['a', 'b', 'c'], ['c'], 'a')).toBe('a');
  });

  it('moves to the tab on the right when the active one closed', () => {
    expect(nextActiveId(['a', 'b', 'c'], ['b'], 'b')).toBe('c');
  });

  it('falls back to the left when the active one was last', () => {
    expect(nextActiveId(['a', 'b', 'c'], ['c'], 'c')).toBe('b');
  });

  it('is empty when the last tab closed', () => {
    expect(nextActiveId(['a'], ['a'], 'a')).toBe('');
  });

  it('skips over other tabs closed in the same breath', () => {
    expect(nextActiveId(['a', 'b', 'c', 'd'], ['b', 'c'], 'b')).toBe('d');
  });
});

describe('seedOpenIds', () => {
  it('opens every note in tab order on the first run', () => {
    const notes = [
      note('second', { sortOrder: 200 }),
      note('first', { sortOrder: 100 }),
    ];

    expect(seedOpenIds(notes)).toEqual(['first', 'second']);
  });

  it('leaves binned notes closed', () => {
    const notes = [
      note('a'),
      note('gone', { deletedAt: '2026-09-15T00:00:00.000Z' }),
    ];

    expect(seedOpenIds(notes)).toEqual(['a']);
  });
});
