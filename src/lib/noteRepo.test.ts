import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    then: vi.fn(),
  };
  const from = vi.fn(() => query);
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.upsert.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  return { from, query };
});

vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }));

import { noteFromRow, rowFromNote, type Note } from './note';
import { deleteNoteRemote, fetchNotes, upsertNote } from './noteRepo';

const note: Note = {
  id: 'a',
  owner: 'Jeff',
  title: 'Shopping',
  body: 'Eggs',
  sortOrder: 100,
  createdAt: '2026-09-09T04:00:00.000Z',
  updatedAt: '2026-09-09T05:00:00.000Z',
};

const row = {
  id: 'a',
  owner: 'Jeff' as const,
  title: 'Shopping',
  body: 'Eggs',
  sort_order: 100,
  created_at: '2026-09-09T04:00:00.000Z',
  updated_at: '2026-09-09T05:00:00.000Z',
};

describe('note cloud repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.order.mockReturnValue(mocks.query);
    mocks.query.upsert.mockReturnValue(mocks.query);
    mocks.query.delete.mockReturnValue(mocks.query);
    mocks.query.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
  });

  it('maps a cloud row onto a Note', () => {
    expect(noteFromRow(row)).toEqual(note);
  });

  it('maps a Note onto a cloud row', () => {
    expect(rowFromNote(note)).toEqual(row);
  });

  it('fetches the selected owner notes in sort order', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: [row], error: null }),
    );

    await expect(fetchNotes('Jeff')).resolves.toEqual({ status: 'ok', rows: [note] });

    expect(mocks.from).toHaveBeenCalledWith('notes');
    expect(mocks.query.select).toHaveBeenCalledWith(
      'id, owner, title, body, sort_order, created_at, updated_at',
    );
    expect(mocks.query.eq).toHaveBeenCalledWith('owner', 'Jeff');
    expect(mocks.query.order).toHaveBeenCalledWith('sort_order');
  });

  it.each(['42P01', 'PGRST205'])(
    'reports missing notes table for %s',
    async (code) => {
      mocks.query.then.mockImplementation((resolve) =>
        resolve({ data: null, error: { code } }),
      );

      await expect(fetchNotes('Rachel')).resolves.toEqual({
        status: 'missing-table',
      });
    },
  );

  it('reports another fetch failure', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: null, error: { code: '500', message: 'failed' } }),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchNotes('Jeff')).resolves.toEqual({ status: 'error' });

    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it('upserts a mapped Note', async () => {
    await expect(upsertNote(note)).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith('notes');
    expect(mocks.query.upsert).toHaveBeenCalledWith(row);
  });

  it('reports a failed upsert', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: null, error: { message: 'failed' } }),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(upsertNote(note)).resolves.toBe(false);

    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it('deletes a note belonging to the selected owner', async () => {
    await expect(deleteNoteRemote('a', 'Jeff')).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith('notes');
    expect(mocks.query.delete).toHaveBeenCalledOnce();
    expect(mocks.query.eq).toHaveBeenNthCalledWith(1, 'id', 'a');
    expect(mocks.query.eq).toHaveBeenNthCalledWith(2, 'owner', 'Jeff');
  });

  it('reports a failed delete', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: null, error: { message: 'failed' } }),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteNoteRemote('a', 'Rachel')).resolves.toBe(false);

    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
