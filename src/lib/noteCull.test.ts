import { describe, expect, it } from 'vitest';
import { extraNoteIds } from './noteCull';
import type { Note } from './note';

function note(id: string, title: string): Note {
  return {
    id,
    owner: 'Jeff',
    title,
    body: '',
    sortOrder: 100,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
  };
}

describe('extraNoteIds', () => {
  it('returns the tabs that are not jeff, MFF, or hi', () => {
    expect(
      extraNoteIds(
        [
          note('1', 'jeff'),
          note('2', 'Note'),
          note('3', 'MFF'),
          note('4', 'Walk'),
          note('5', 'hi'),
        ],
        ['jeff', 'MFF', 'hi'],
      ),
    ).toEqual(['2', '4']);
  });

  it('does not wipe the pad when the three names are not in the list yet', () => {
    expect(extraNoteIds([note('1', 'Note'), note('2', 'Walk')], ['jeff', 'MFF', 'hi'])).toBe(
      null,
    );
  });
});
