import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note } from './note';
import type { NoteFolder } from './noteFolder';

const mocks = vi.hoisted(() => ({
  loadNotes: vi.fn(),
  saveNote: vi.fn(),
  deleteNoteLocally: vi.fn(),
  loadPendingDeletes: vi.fn(),
  clearPendingDelete: vi.fn(),
  loadFolders: vi.fn(),
  saveFolders: vi.fn(),
  deleteFoldersLocally: vi.fn(),
  fetchNotes: vi.fn(),
  upsertNote: vi.fn(),
  deleteNoteRemote: vi.fn(),
  fetchFolders: vi.fn(),
  upsertFolders: vi.fn(),
  deleteFoldersRemote: vi.fn(),
}));

vi.mock('./noteLocal', () => ({
  loadNotes: mocks.loadNotes,
  saveNote: mocks.saveNote,
  deleteNoteLocally: mocks.deleteNoteLocally,
  loadPendingDeletes: mocks.loadPendingDeletes,
  clearPendingDelete: mocks.clearPendingDelete,
  loadFolders: mocks.loadFolders,
  saveFolders: mocks.saveFolders,
  deleteFoldersLocally: mocks.deleteFoldersLocally,
}));

vi.mock('./noteRepo', () => ({
  fetchNotes: mocks.fetchNotes,
  upsertNote: mocks.upsertNote,
  deleteNoteRemote: mocks.deleteNoteRemote,
}));

vi.mock('./noteFolderRepo', () => ({
  fetchFolders: mocks.fetchFolders,
  upsertFolders: mocks.upsertFolders,
  deleteFoldersRemote: mocks.deleteFoldersRemote,
}));

import { NOTE_CULL_FLAG } from './noteCull';
import { forgetNote, reconcileNotes } from './noteSync';

const EARLY = '2026-09-09T04:00:00.000Z';
const LATE = '2026-09-09T05:00:00.000Z';
const LONG_AGO = '2026-07-01T00:00:00.000Z';

function note(partial: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    owner: 'Jeff',
    title: 'Note',
    body: '',
    sortOrder: 100,
    createdAt: EARLY,
    updatedAt: EARLY,
    folderId: null,
    saved: true,
    binGroup: null,
    deletedAt: null,
    ...partial,
  };
}

function folder(partial: Partial<NoteFolder> & Pick<NoteFolder, 'id'>): NoteFolder {
  return {
    owner: 'Jeff',
    parentId: null,
    name: 'Recipes',
    colour: '#4F7A2A',
    position: 100,
    binGroup: null,
    deletedAt: null,
    createdAt: EARLY,
    updatedAt: EARLY,
    ...partial,
  };
}

describe('reconcileNotes', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    mocks.loadNotes.mockReset();
    mocks.loadPendingDeletes.mockReset();
    mocks.fetchNotes.mockReset();
    mocks.loadFolders.mockResolvedValue([]);
    mocks.fetchFolders.mockResolvedValue({ status: 'ok', rows: [] });
    mocks.saveNote.mockResolvedValue(true);
    mocks.saveFolders.mockResolvedValue(true);
    mocks.deleteFoldersLocally.mockResolvedValue(true);
    mocks.clearPendingDelete.mockResolvedValue(undefined);
    mocks.upsertNote.mockResolvedValue(true);
    mocks.upsertFolders.mockResolvedValue(true);
    mocks.deleteNoteRemote.mockResolvedValue(true);
    mocks.deleteFoldersRemote.mockResolvedValue(true);
    mocks.deleteNoteLocally.mockResolvedValue(true);
  });

  it('returns the newer device body when the cloud copy is older', async () => {
    const local = note({ id: 'shared', body: 'device', updatedAt: LATE });
    const remote = note({ id: 'shared', body: 'cloud', updatedAt: EARLY });
    mocks.loadNotes.mockResolvedValue([local]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [remote] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes).toEqual([local]);
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

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes).toEqual([savedDuringFetch]);
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

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.saveNote.mock.calls.map((call) => call[0].id)).toEqual(['keep']);
    expect(mocks.upsertNote.mock.calls.map((call) => call[0].id)).toEqual(['keep']);
  });

  it('does not upsert a tab forgotten while the merge is being written', async () => {
    const keep = note({ id: 'keep', title: 'Walk' });
    const gone = note({ id: 'gone', title: 'hi', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([keep, gone]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [keep, gone] });
    mocks.saveNote.mockImplementation(async (row: Note) => {
      if (row.id === 'keep') {
        mocks.loadPendingDeletes.mockResolvedValue(['gone']);
      }
      return true;
    });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.upsertNote.mock.calls.map((call) => call[0].id)).toEqual(['keep']);
  });

  it('leaves a pending delete out of the reconciled notes', async () => {
    const gone = note({ id: 'gone' });
    const keep = note({ id: 'keep', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([gone, keep]);
    mocks.loadPendingDeletes.mockResolvedValue(['gone']);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [gone, keep] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.deleteNoteRemote).toHaveBeenCalledWith('gone', 'Jeff');
    expect(mocks.clearPendingDelete).toHaveBeenCalledWith('gone');
  });

  /* The pad used to plant an empty Note whenever it found nothing, because
     tabs were the only place a note could live and a tabless pad had no
     way back. The files page is that way back now, so an empty device
     stays empty instead of manufacturing a note nobody asked for. */
  it('leaves an empty device empty instead of planting a Note', async () => {
    mocks.loadNotes.mockResolvedValue([]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes).toEqual([]);
    expect(mocks.saveNote).not.toHaveBeenCalled();
    expect(mocks.upsertNote).not.toHaveBeenCalled();
  });

  it('serialises overlapping runs so both see the same result', async () => {
    let local: Note[] = [note({ id: 'only' })];
    mocks.loadNotes.mockImplementation(async () => local);
    mocks.saveNote.mockImplementation(async (row: Note) => {
      local = [row];
      return true;
    });
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [] });

    const [first, second] = await Promise.all([
      reconcileNotes('Jeff', LATE),
      reconcileNotes('Jeff', LATE),
    ]);

    expect(first.notes.map((row) => row.id)).toEqual(
      second.notes.map((row) => row.id),
    );
  });

  it('keeps the pending delete when the cloud row is still there', async () => {
    const gone = note({ id: 'gone' });
    const keep = note({ id: 'keep', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([keep]);
    mocks.loadPendingDeletes.mockResolvedValue(['gone']);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [gone, keep] });
    mocks.deleteNoteRemote.mockResolvedValue(false);

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.id)).toEqual(['keep']);
    expect(mocks.clearPendingDelete).not.toHaveBeenCalled();
    expect(mocks.upsertNote).toHaveBeenCalledWith(keep);
  });

  it('keeps a draft on this device and out of the cloud', async () => {
    const draft = note({ id: 'draft', title: 'Untitled', saved: false });
    const file = note({ id: 'file', sortOrder: 200 });
    mocks.loadNotes.mockResolvedValue([draft, file]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [file] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.id)).toEqual(['draft', 'file']);
    expect(mocks.saveNote.mock.calls.map((call) => call[0].id)).toEqual([
      'draft',
      'file',
    ]);
    expect(mocks.upsertNote.mock.calls.map((call) => call[0].id)).toEqual([
      'file',
    ]);
  });

  it('keeps the newer folder and pushes the merge back up', async () => {
    const local = folder({ id: 'f', name: 'Recipes', updatedAt: LATE });
    const remote = folder({ id: 'f', name: 'Old name', updatedAt: EARLY });
    mocks.loadNotes.mockResolvedValue([]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [] });
    mocks.loadFolders.mockResolvedValue([local]);
    mocks.fetchFolders.mockResolvedValue({ status: 'ok', rows: [remote] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.folders).toEqual([local]);
    expect(mocks.saveFolders).toHaveBeenCalledWith([local]);
    expect(mocks.upsertFolders).toHaveBeenCalledWith([local]);
  });

  it('keeps folders on the device while the cloud table is missing', async () => {
    const local = folder({ id: 'f' });
    mocks.loadNotes.mockResolvedValue([]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [] });
    mocks.loadFolders.mockResolvedValue([local]);
    mocks.fetchFolders.mockResolvedValue({ status: 'missing-table' });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.folders).toEqual([local]);
    expect(mocks.saveFolders).toHaveBeenCalledWith([local]);
    expect(mocks.upsertFolders).not.toHaveBeenCalled();
  });

  it('sweeps what has sat in the bin past 30 days, here and in the cloud', async () => {
    const stale = note({ id: 'stale', deletedAt: LONG_AGO });
    const fresh = note({ id: 'fresh', deletedAt: LATE, sortOrder: 200 });
    const staleFolder = folder({ id: 'staleFolder', deletedAt: LONG_AGO });
    mocks.loadNotes.mockResolvedValue([stale, fresh]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [stale, fresh] });
    mocks.loadFolders.mockResolvedValue([staleFolder]);
    mocks.fetchFolders.mockResolvedValue({ status: 'ok', rows: [staleFolder] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.id)).toEqual(['fresh']);
    expect(result.folders).toEqual([]);
    expect(mocks.deleteNoteRemote).toHaveBeenCalledWith('stale', 'Jeff');
    expect(mocks.deleteFoldersRemote).toHaveBeenCalledWith(['staleFolder']);
  });

  it('keeps a binned note that has not expired, so the bin can show it', async () => {
    const binned = note({ id: 'binned', deletedAt: LATE, binGroup: 'g' });
    mocks.loadNotes.mockResolvedValue([binned]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.fetchNotes.mockResolvedValue({ status: 'ok', rows: [] });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes).toEqual([binned]);
    expect(mocks.upsertNote).toHaveBeenCalledWith(binned);
  });

  it('drops Jeff tabs that are not jeff, MFF, or hi on the first refresh', async () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
    const jeff = note({ id: 'j', title: 'jeff' });
    const mff = note({ id: 'm', title: 'MFF', sortOrder: 200 });
    const hi = note({ id: 'h', title: 'hi', sortOrder: 300 });
    const extra = note({ id: 'x', title: 'Walk', sortOrder: 400 });
    mocks.loadNotes.mockResolvedValue([jeff, mff, hi, extra]);
    mocks.loadPendingDeletes.mockResolvedValue([]);
    mocks.deleteNoteLocally.mockImplementation(async (id: string) => {
      mocks.loadPendingDeletes.mockResolvedValue([id]);
      return true;
    });
    mocks.fetchNotes.mockResolvedValue({
      status: 'ok',
      rows: [jeff, mff, hi, extra],
    });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes.map((row) => row.title)).toEqual(['jeff', 'MFF', 'hi']);
    expect(mocks.deleteNoteLocally).toHaveBeenCalledWith('x', 'Jeff');
    expect(store[NOTE_CULL_FLAG]).toBe('1');
  });

  it('does not contact the cloud when the notes table is missing', async () => {
    const local = note({ id: 'local', body: 'device' });
    mocks.loadNotes.mockResolvedValue([local]);
    mocks.loadPendingDeletes.mockResolvedValue(['gone']);
    mocks.fetchNotes.mockResolvedValue({ status: 'missing-table' });

    const result = await reconcileNotes('Jeff', LATE);

    expect(result.notes).toEqual([local]);
    expect(mocks.deleteNoteRemote).not.toHaveBeenCalled();
    expect(mocks.clearPendingDelete).not.toHaveBeenCalled();
    expect(mocks.upsertNote).not.toHaveBeenCalled();
  });
});

describe('forgetNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteNoteLocally.mockResolvedValue(true);
    mocks.deleteNoteRemote.mockResolvedValue(true);
  });

  it('forgets a file on this phone and in the cloud', async () => {
    await forgetNote('gone', 'Jeff');

    expect(mocks.deleteNoteLocally).toHaveBeenCalledWith('gone', 'Jeff', true);
    expect(mocks.deleteNoteRemote).toHaveBeenCalledWith('gone', 'Jeff');
  });

  /* A draft was never pushed, so there is no cloud row to chase and no
     reason to queue a pending delete that every later reconcile retries. */
  it('does not reach for the cloud when the note was only ever a draft', async () => {
    await forgetNote('draft', 'Jeff', false);

    expect(mocks.deleteNoteLocally).toHaveBeenCalledWith('draft', 'Jeff', false);
    expect(mocks.deleteNoteRemote).not.toHaveBeenCalled();
  });
});
