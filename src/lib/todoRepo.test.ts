import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    then: vi.fn(),
  };
  const deleteFrom = vi.fn(() => query);
  const from = vi.fn(() => ({ delete: deleteFrom }));
  query.eq.mockReturnValue(query);
  return { deleteFrom, from, query };
});

vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }));

import { deleteCompletedTodos } from './todoRepo';

describe('deleteCompletedTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.then.mockImplementation((resolve) => resolve({ error: null }));
  });

  it('deletes completed todos for the selected owner', async () => {
    await expect(deleteCompletedTodos('Jeff')).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith('todos');
    expect(mocks.deleteFrom).toHaveBeenCalledOnce();
    expect(mocks.query.eq).toHaveBeenNthCalledWith(1, 'owner', 'Jeff');
    expect(mocks.query.eq).toHaveBeenNthCalledWith(2, 'done', true);
  });

  it('reports a failed delete without claiming it succeeded', async () => {
    mocks.query.then.mockImplementation((resolve) =>
      resolve({ error: { message: 'delete failed' } }),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteCompletedTodos('Rachel')).resolves.toBe(false);

    expect(mocks.query.eq).toHaveBeenNthCalledWith(1, 'owner', 'Rachel');
    expect(mocks.query.eq).toHaveBeenNthCalledWith(2, 'done', true);
    errorSpy.mockRestore();
  });
});
