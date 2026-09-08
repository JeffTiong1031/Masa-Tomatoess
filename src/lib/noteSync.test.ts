import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note } from './note';

const mocks = vi.hoisted(() => ({
  loadNotes: vi.fn(),
  saveNote: vi.fn(),
  deleteNoteLocally: vi.fn(),
  loadPendingDeletes: vi.fn(),
  clearPendingDelete: vi.fn(),
  fetchNotes: vi.fn(),
  upsertNote: vi.fn(),
  deleteNoteRemote: vi.fn(),
}));

vi.mock('./noteLocal', () => ({
  loadNotes: mocks.loadNotes,
  saveNote: mocks.saveNote,
  deleteNoteLocally: mocks.deleteNoteLocally,
  loadPendingDeletes: mocks.loadPendingDeletes,
  clearPendingDelete: mocks.clearPendingDelete,
}));

vi.mock('./noteRepo', () => ({
  fetchNotes: mocks.fetchNotes,
  upsertNote: mocks.upsertNote,
  deleteNoteRemote: mocks.deleteNoteRemote,
}));

import { reconcileNotes } from './noteSync';

const EARLY = '2026-09-09T04:00:00.000Z';
const LATE = '2026-09-09T05:00:00.000Z';

function note(partial: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    owner: 'Jeff',
    title: 'Note',
    body: '',
    sortOrder: 100,
    createdAt: EARLY,
    updatedAt: EARLY,
    ...partial,
  };
}

describe('reconcileNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveNote.mockResolvedValue(true);
    mocks.clearPendingDelete.mockResolvedValue(undefined);
    mocks.upsertNote.mockResolvedValue(true);
    mocks.deleteNoteRemote.mockResolvedValue(true);
  });

  it('returns the newer device body when the cloud copy is older', async () => {
    const local = note({ id: 'shared', body: 'device', updatedAt: LATE });
    const remote = note({ id: 'shared', body: 'cloud', updatedAt: EARLY });
    mocks.loadNotes.mockResolvedValue([local]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [remote] });

    await expect(reconcileNotes('Jeff', LATE, 'seed')).resolves.toEqual([local]);

    expect(mocks.saveNote).toHaveBeenCalledWith(local);
    expect(mocks.upsertNote).toHaveBeenCalledWith(local);
  });

  it('leaves a pending delete out of the reconciled notes', async () => {
    const gone = note({ id: 'gone' });
    const keep = note({ id: 'keep', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([gone, keep]);
    mocks.loadPendingDeletes.mockResolvedValue(['gone']);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [gone, keep] });

    const result = await reconcileNotes('Jeff', LATE, 'seed');

    expect(result.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.deleteNoteRemote).toHaveBeenCalledWith('gone', 'Jeff');
    expect(mocks.clearPendingDelete).toHaveBeenCalledWith('gone');
  });

  it('seeds an empty device when the cloud table is missing', async () => {
    mocks.loadNotes.mockResolvedValue([]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'missing-table' });

    await expect(reconcileNotes('Jeff', LATE, 'seed')).resolves.toEqual([
      {
        id: 'seed',
        owner: 'Jeff',
        title: 'Note',
        body: '',
        sortOrder: 100,
        createdAt: LATE,
        updatedAt: LATE,
      },
    ]);

    expect(mocks.saveNote).toHaveBeenCalledOnce();
    expect(mocks.upsertNote).not.toHaveBeenCalled();
  });
});
