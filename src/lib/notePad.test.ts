import { describe, it, expect } from 'vitest';
import { DEFAULT_NOTE_TITLE, type Note } from './note';
import {
  titleOrDefault,
  nextSortOrder,
  seedPad,
  addNote,
  isActiveNoteOwnedBy,
  renameNote,
  removeNote,
} from './notePad';

const NOW = '2026-09-09T04:00:00.000Z';

function sample(overrides: Partial<Note> = {}): Note {
  return {
    id: 'a',
    owner: 'Jeff',
    title: DEFAULT_NOTE_TITLE,
    body: '',
    sortOrder: 100,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('titleOrDefault', () => {
  it('keeps a typed name', () => {
    expect(titleOrDefault('  Shopping  ')).toBe('Shopping');
  });

  it('falls back to Note when the name is empty', () => {
    expect(titleOrDefault('   ')).toBe(DEFAULT_NOTE_TITLE);
    expect(DEFAULT_NOTE_TITLE).toBe('Note');
  });
});

describe('seedPad', () => {
  it('starts with one empty Note for that person', () => {
    expect(seedPad('Rachel', NOW, 'seed')).toEqual([
      {
        id: 'seed',
        owner: 'Rachel',
        title: 'Note',
        body: '',
        sortOrder: 100,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
  });
});

describe('addNote', () => {
  it('appends a blank tab after the current last sort order', () => {
    const notes = [sample({ sortOrder: 100 }), sample({ id: 'b', sortOrder: 200 })];
    expect(nextSortOrder(notes)).toBe(300);
    const next = addNote(notes, 'Jeff', NOW, 'c');
    expect(next).toHaveLength(3);
    expect(next[2]).toMatchObject({
      id: 'c',
      owner: 'Jeff',
      title: 'Note',
      body: '',
      sortOrder: 300,
    });
  });
});

describe('isActiveNoteOwnedBy', () => {
  it('rejects the previous person’s active tab during an owner switch', () => {
    const jeffNotes = [sample({ id: 'jeff-active', owner: 'Jeff' })];

    expect(isActiveNoteOwnedBy(jeffNotes, 'jeff-active', 'Rachel')).toBe(false);
    expect(isActiveNoteOwnedBy(jeffNotes, 'jeff-active', 'Jeff')).toBe(true);
  });
});

describe('renameNote', () => {
  it('writes the trimmed name and bumps updatedAt', () => {
    const next = renameNote([sample()], 'a', '  Lecture ', '2026-09-09T05:00:00.000Z');
    expect(next[0].title).toBe('Lecture');
    expect(next[0].updatedAt).toBe('2026-09-09T05:00:00.000Z');
  });

  it('uses Note when the new name is blank', () => {
    const next = renameNote([sample({ title: 'Old' })], 'a', ' ', NOW);
    expect(next[0].title).toBe('Note');
  });
});

describe('removeNote', () => {
  it('drops that tab when others remain', () => {
    const notes = [sample(), sample({ id: 'b', title: 'Keep' })];
    expect(removeNote(notes, 'a', 'Jeff', NOW, 'unused')).toEqual([
      sample({ id: 'b', title: 'Keep' }),
    ]);
  });

  it('plants a fresh empty Note when the last tab is deleted', () => {
    const next = removeNote([sample({ body: 'gone' })], 'a', 'Jeff', NOW, 'fresh');
    expect(next).toEqual(seedPad('Jeff', NOW, 'fresh'));
  });
});
