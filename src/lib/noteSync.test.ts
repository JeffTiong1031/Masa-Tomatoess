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

import { forgetNote, reconcileNotes } from './noteSync';

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
    mocks.loadNotes.mockReset();
    mocks.loadPendingDeletes.mockReset();
    mocks.fetchNotes.mockReset();
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

  it('does not replace a local row saved while the cloud fetch is running', async () => {
    const beforeFetch = note({ id: 'shared', body: 'before', updatedAt: EARLY });
    const savedDuringFetch = note({
      id: 'shared',
      body: 'typed during fetch',
      updatedAt: LATE,
    });
    const remote = note({ id: 'shared', body: 'cloud', updatedAt: EARLY });
    mocks.loadNotes.mockResolvedValue([beforeFetch]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockImplementation(async () => {
      mocks.loadNotes.mockResolvedValue([savedDuringFetch]);
      return { status: 'ok', rows: [remote] };
    });

    await expect(reconcileNotes('Jeff', LATE, 'seed')).resolves.toEqual([
      savedDuringFetch,
    ]);

    expect(mocks.saveNote).toHaveBeenCalledWith(savedDuringFetch);
    expect(mocks.upsertNote).toHaveBeenCalledWith(savedDuringFetch);
  });

  it('does not write a tab back when it is deleted while the cloud fetch is running', async () => {
    const keep = note({ id: 'keep', title: 'Walk' });
    const gone = note({ id: 'gone', title: 'MFF', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([keep, gone]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockImplementation(async () => {
      mocks.loadNotes.mockResolvedValue([keep]);
      mocks.loadPendingDeletes.mockResolvedValue(['gone']);
      return { status: 'ok', rows: [keep, gone] };
    });

    const result = await reconcileNotes('Jeff', LATE, 'seed');

    expect(result.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.saveNote.mock.calls.map((call) => call[0].id)).toEqual(['keep']);
    expect(mocks.upsertNote.mock.calls.map((call) => call[0].id)).toEqual([
      'keep',
    ]);
  });

  it('does not plant a second empty Note when two empty reconciles overlap', async () => {
    let local: Note[] = [];
    mocks.loadNotes.mockImplementation(async () => local);
    mocks.saveNote.mockImplementation(async (row) => {
      local = [row];
      return true;
    });
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [] });

    const [first, second] = await Promise.all([
      reconcileNotes('Jeff', LATE, 'seed-a'),
      reconcileNotes('Jeff', LATE, 'seed-b'),
    ]);

    expect(first.map((row) => row.id)).toEqual(second.map((row) => row.id));
    expect(new Set(mocks.upsertNote.mock.calls.map((call) => call[0].id)).size).toBe(
      1,
    );
  });

  it('does not upsert a tab forgotten while the merge is being written', async () => {
    const keep = note({ id: 'keep', title: 'Walk' });
    const gone = note({ id: 'gone', title: 'hi', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([keep, gone]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [keep, gone] });
    mocks.saveNote.mockImplementation(async (row) => {
      if (row.id === 'keep') {
        mocks.loadPendingDeletes.mockResolvedValue(['gone']);
      }
      return true;
    });

    const result = await reconcileNotes('Jeff', LATE, 'seed');

    expect(result.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.upsertNote.mock.calls.map((call) => call[0].id)).toEqual([
      'keep',
    ]);
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

  it('keeps the pending delete when the cloud row is still there', async () => {
    const gone = note({ id: 'gone' });
    const keep = note({ id: 'keep', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([keep]);
    mocks.loadPendingDeletes.mockResolvedValue(['gone']);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [gone, keep] });
    mocks.deleteNoteRemote.mockResolvedValue(false);

    const result = await reconcileNotes('Jeff', LATE, 'seed');

    expect(result.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.deleteNoteRemote).toHaveBeenCalledWith('gone', 'Jeff');
    expect(mocks.clearPendingDelete).not.toHaveBeenCalled();
    expect(mocks.upsertNote).toHaveBeenCalledWith(keep);
  });

  it('forgets a tab on this phone and in the cloud', async () => {
    mocks.deleteNoteLocally.mockResolvedValue(true);
    mocks.deleteNoteRemote.mockResolvedValue(true);

    await forgetNote('gone', 'Jeff');

    expect(mocks.deleteNoteLocally).toHaveBeenCalledWith('gone', 'Jeff');
    expect(mocks.deleteNoteRemote).toHaveBeenCalledWith('gone', 'Jeff');
    expect(mocks.clearPendingDelete).not.toHaveBeenCalled();
  });

  it('leaves the pending delete when the cloud delete does not stick', async () => {
    mocks.deleteNoteLocally.mockResolvedValue(true);
    mocks.deleteNoteRemote.mockResolvedValue(false);

    await forgetNote('gone', 'Jeff');

    expect(mocks.clearPendingDelete).not.toHaveBeenCalled();
  });

  it('does not contact the cloud when the notes table is missing', async () => {
    const local = note({ id: 'local', body: 'device' });
    mocks.loadNotes.mockResolvedValue([local]);
    mocks.loadPendingDeletes.mockResolvedValue(['gone']);
    mocks.fetchNotes.mockResolvedValue({ status: 'missing-table' });

    await expect(reconcileNotes('Jeff', LATE, 'seed')).resolves.toEqual([local]);

    expect(mocks.deleteNoteRemote).not.toHaveBeenCalled();
    expect(mocks.clearPendingDelete).not.toHaveBeenCalled();
    expect(mocks.upsertNote).not.toHaveBeenCalled();
  });
});
