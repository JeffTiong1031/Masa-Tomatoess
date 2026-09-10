import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chain = () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      upsert: vi.fn(),
      then: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.insert.mockReturnValue(query);
    query.update.mockReturnValue(query);
    query.delete.mockReturnValue(query);
    query.single.mockReturnValue(query);
    query.maybeSingle.mockReturnValue(query);
    query.upsert.mockReturnValue(query);
    return query;
  };
  const query = chain();
  const state = chain();
  const from = vi.fn((table: string) =>
    table === 'count_up_state' ? state : query,
  );
  return { from, query, state };
});

vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }));

import {
  deleteCountUpEntry,
  fetchCountUpEntries,
  insertCountUpEntry,
  loadCountUpList,
  togetherSeedRow,
  updateCountUpEntry,
} from './countUpRepo';

const row = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  owner: 'Jeff' as const,
  label: 'Together',
  date: '2025-08-09',
};

describe('count-up cloud repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const query of [mocks.query, mocks.state]) {
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.insert.mockReturnValue(query);
      query.update.mockReturnValue(query);
      query.delete.mockReturnValue(query);
      query.single.mockReturnValue(query);
      query.maybeSingle.mockReturnValue(query);
      query.upsert.mockReturnValue(query);
      query.then.mockImplementation((resolve) =>
        resolve({ data: query === mocks.state ? null : [], error: null }),
      );
    }
  });

  it('fetches only the signed-in person\'s rows', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: [row], error: null }),
    );

    await expect(fetchCountUpEntries('Jeff')).resolves.toEqual([
      {
        id: row.id,
        label: 'Together',
        date: '2025-08-09',
      },
    ]);

    expect(mocks.from).toHaveBeenCalledWith('count_up_entries');
    expect(mocks.query.eq).toHaveBeenCalledWith('owner', 'Jeff');
    expect(mocks.query.order).toHaveBeenCalledWith('date', { ascending: true });
  });

  it('does not mix Rachel\'s rows into Jeff\'s fetch', async () => {
    await fetchCountUpEntries('Rachel');
    expect(mocks.query.eq).toHaveBeenCalledWith('owner', 'Rachel');
    expect(mocks.query.eq).not.toHaveBeenCalledWith('owner', 'Jeff');
  });

  it('inserts a row for that person, not a calendar event', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: row, error: null }),
    );

    await expect(
      insertCountUpEntry('Jeff', 'Together', '2025-08-09'),
    ).resolves.toEqual({
      id: row.id,
      label: 'Together',
      date: '2025-08-09',
    });

    expect(mocks.from).toHaveBeenCalledWith('count_up_entries');
    expect(mocks.query.insert).toHaveBeenCalledWith({
      owner: 'Jeff',
      label: 'Together',
      date: '2025-08-09',
    });
  });

  it('updates label and date on that person\'s row', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ error: null }),
    );

    await expect(
      updateCountUpEntry(row.id, 'Jeff', 'Us', '2025-08-10'),
    ).resolves.toBe(true);

    expect(mocks.query.update).toHaveBeenCalledWith({
      label: 'Us',
      date: '2025-08-10',
      updated_at: expect.any(String),
    });
    expect(mocks.query.eq).toHaveBeenNthCalledWith(1, 'id', row.id);
    expect(mocks.query.eq).toHaveBeenNthCalledWith(2, 'owner', 'Jeff');
  });

  it('deletes only that person\'s row', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ error: null }),
    );

    await expect(deleteCountUpEntry(row.id, 'Jeff')).resolves.toBe(true);
    expect(mocks.query.delete).toHaveBeenCalledOnce();
    expect(mocks.query.eq).toHaveBeenNthCalledWith(1, 'id', row.id);
    expect(mocks.query.eq).toHaveBeenNthCalledWith(2, 'owner', 'Jeff');
  });

  it('describes the Together seed without a calendar countdown flag', () => {
    expect(togetherSeedRow('Rachel')).toEqual({
      owner: 'Rachel',
      label: 'Together',
      date: '2025-08-09',
    });
    expect(togetherSeedRow('Rachel')).not.toHaveProperty('countdown');
  });

  it('returns null when the table is missing', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: null, error: { code: 'PGRST205' } }),
    );
    await expect(fetchCountUpEntries('Jeff')).resolves.toBeNull();
  });

  it('seeds Together for that person when the cloud list is empty', async () => {
    let calls = 0;
    mocks.query.then.mockImplementation((resolve) => {
      calls += 1;
      if (calls === 1) return resolve({ data: [], error: null });
      if (calls === 2) return resolve({ data: row, error: null });
      return resolve({ data: [row], error: null });
    });

    await expect(loadCountUpList('Jeff', [])).resolves.toEqual([
      { id: row.id, label: 'Together', date: '2025-08-09' },
    ]);

    expect(mocks.query.insert).toHaveBeenCalledWith({
      owner: 'Jeff',
      label: 'Together',
      date: '2025-08-09',
    });
    expect(mocks.state.upsert).toHaveBeenCalledWith(
      { owner: 'Jeff' },
      { onConflict: 'owner' },
    );
  });

  it('keeps an emptied list empty instead of putting Together back', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ data: [], error: null }),
    );
    mocks.state.then.mockImplementation((resolve) =>
      resolve({ data: { owner: 'Jeff' }, error: null }),
    );

    await expect(loadCountUpList('Jeff', [])).resolves.toEqual([]);
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it('uploads leftover local rows instead of seeding Together', async () => {
    let calls = 0;
    mocks.query.then.mockImplementation((resolve) => {
      calls += 1;
      if (calls === 1) return resolve({ data: [], error: null });
      if (calls === 2) {
        return resolve({
          data: {
            id: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
            owner: 'Jeff',
            label: 'Moved in',
            date: '2024-06-01',
          },
          error: null,
        });
      }
      return resolve({
        data: [
          {
            id: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
            owner: 'Jeff',
            label: 'Moved in',
            date: '2024-06-01',
          },
        ],
        error: null,
      });
    });

    await expect(
      loadCountUpList('Jeff', [
        { id: 'id-1', label: 'Moved in', date: '2024-06-01' },
      ]),
    ).resolves.toEqual([
      {
        id: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
        label: 'Moved in',
        date: '2024-06-01',
      },
    ]);

    expect(mocks.query.insert).toHaveBeenCalledWith({
      owner: 'Jeff',
      label: 'Moved in',
      date: '2024-06-01',
    });
    expect(mocks.query.insert).not.toHaveBeenCalledWith(
      togetherSeedRow('Jeff'),
    );
    expect(mocks.state.upsert).toHaveBeenCalledWith(
      { owner: 'Jeff' },
      { onConflict: 'owner' },
    );
  });

  it('only seeds once when two loads overlap', async () => {
    let releaseFirst!: (value: unknown) => void;
    const firstFetch = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    mocks.query.then.mockImplementation((resolve) => {
      calls += 1;
      if (calls === 1) {
        return firstFetch.then(() => resolve({ data: [], error: null }));
      }
      if (calls === 2) return resolve({ data: row, error: null });
      return resolve({ data: [row], error: null });
    });

    const first = loadCountUpList('Jeff', []);
    const second = loadCountUpList('Jeff', []);
    releaseFirst(undefined);

    await expect(Promise.all([first, second])).resolves.toEqual([
      [{ id: row.id, label: 'Together', date: '2025-08-09' }],
      [{ id: row.id, label: 'Together', date: '2025-08-09' }],
    ]);
    expect(mocks.query.insert).toHaveBeenCalledOnce();
  });
});
