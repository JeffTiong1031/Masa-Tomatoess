import { describe, it, expect } from 'vitest';
import { DEFAULT_NOTE_TITLE, DRAFT_NOTE_TITLE, type Note } from './note';
import {
  titleOrDefault,
  nextSortOrder,
  newDraft,
  isActiveNoteOwnedBy,
  renameNote,
  patchNotes,
  dropNotes,
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
    folderId: null,
    saved: true,
    binGroup: null,
    deletedAt: null,
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

describe('newDraft', () => {
  it('appends after the current last sort order', () => {
    const notes = [sample({ sortOrder: 100 }), sample({ id: 'b', sortOrder: 200 })];
    expect(nextSortOrder(notes)).toBe(300);
    expect(newDraft(notes, 'Jeff', NOW, 'c').sortOrder).toBe(300);
  });

  /* A new note is a scribble, not a file. It has no folder, it is not
     pushed to the cloud, and it does not appear on the files page until
     you save it -- which is the whole point of the red dot on its tab. */
  it('starts unsaved, unfiled, and named Untitled', () => {
    const made = newDraft([], 'Rachel', NOW, 'first');

    expect(made).toEqual({
      id: 'first',
      owner: 'Rachel',
      title: DRAFT_NOTE_TITLE,
      body: '',
      sortOrder: 100,
      createdAt: NOW,
      updatedAt: NOW,
      folderId: null,
      saved: false,
      binGroup: null,
      deletedAt: null,
    });
    expect(DRAFT_NOTE_TITLE).toBe('Untitled');
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

describe('patchNotes', () => {
  it('replaces rows in place, keeping their order', () => {
    const notes = [sample(), sample({ id: 'b' })];
    const next = patchNotes(notes, [sample({ id: 'b', title: 'Changed' })]);

    expect(next.map((n) => n.id)).toEqual(['a', 'b']);
    expect(next[1].title).toBe('Changed');
  });

  it('adds rows it has not seen before', () => {
    const next = patchNotes([sample()], [sample({ id: 'new' })]);

    expect(next.map((n) => n.id)).toEqual(['a', 'new']);
  });

  it('returns the same array when there is nothing to patch', () => {
    const notes = [sample()];
    expect(patchNotes(notes, [])).toBe(notes);
  });
});

describe('dropNotes', () => {
  /* No re-seeding. Deleting the last note leaves nothing, and the pad
     shows its two doors instead of a note you did not ask for. */
  it('drops every id given and does not plant a replacement', () => {
    const notes = [sample(), sample({ id: 'b' })];

    expect(dropNotes(notes, ['a', 'b'])).toEqual([]);
    expect(dropNotes(notes, ['a']).map((n) => n.id)).toEqual(['b']);
  });
});
