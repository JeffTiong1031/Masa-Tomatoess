import { describe, it, expect } from 'vitest';
import { mergeNotes } from './noteMerge';
import { DEFAULT_NOTE_TITLE, type Note } from './note';

const EARLY = '2026-09-09T04:00:00.000Z';
const LATE = '2026-09-09T05:00:00.000Z';

function note(partial: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    owner: 'Jeff',
    title: DEFAULT_NOTE_TITLE,
    body: '',
    sortOrder: 100,
    createdAt: EARLY,
    updatedAt: EARLY,
    ...partial,
  };
}

describe('mergeNotes', () => {
  it('keeps the later updatedAt when both sides have the same id', () => {
    const local = [note({ id: 'a', body: 'phone', updatedAt: EARLY })];
    const remote = [note({ id: 'a', body: 'laptop', updatedAt: LATE })];
    expect(mergeNotes(local, remote, [])[0].body).toBe('laptop');
  });

  it('does not replace the device copy with an equally old or older cloud row', () => {
    const local = [note({ id: 'a', body: 'phone', updatedAt: LATE })];
    const remote = [note({ id: 'a', body: 'stale', updatedAt: EARLY })];
    expect(mergeNotes(local, remote, [])[0].body).toBe('phone');
  });

  it('keeps one phone copy when both sides have the same updatedAt', () => {
    const local = [note({ id: 'a', body: 'phone', updatedAt: LATE })];
    const remote = [note({ id: 'a', body: 'phone', updatedAt: LATE })];
    expect(mergeNotes(local, remote, [])).toEqual(local);
  });

  it('keeps a local-only tab and adds a remote-only tab', () => {
    const merged = mergeNotes(
      [note({ id: 'local', sortOrder: 100 })],
      [note({ id: 'cloud', sortOrder: 200 })],
      [],
    );
    expect(merged.map((row) => row.id)).toEqual(['local', 'cloud']);
  });

  it('drops a tab whose delete is still waiting to go up', () => {
    const merged = mergeNotes(
      [note({ id: 'gone' })],
      [note({ id: 'gone' }), note({ id: 'keep', sortOrder: 200 })],
      ['gone'],
    );
    expect(merged.map((row) => row.id)).toEqual(['keep']);
  });
});
