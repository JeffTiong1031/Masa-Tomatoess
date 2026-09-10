import { describe, expect, it } from 'vitest';
import { localCountUpCache, withoutLocalCountUpEntries } from './countUpCache';

describe('localCountUpCache', () => {
  it('reads leftover local Count Up rows so they can be uploaded', () => {
    const raw = JSON.stringify({
      state: {
        mode: 'countup',
        entries: [
          { id: 'together-seed', label: 'Together', date: '2025-08-09' },
          { id: 'id-1', label: 'Moved in', date: '2024-06-01' },
        ],
      },
      version: 0,
    });
    expect(localCountUpCache(raw)).toEqual([
      { id: 'together-seed', label: 'Together', date: '2025-08-09' },
      { id: 'id-1', label: 'Moved in', date: '2024-06-01' },
    ]);
  });

  it('returns nothing when there is no local cache', () => {
    expect(localCountUpCache(null)).toEqual([]);
  });

  it('drops leftover local rows after they have been uploaded', () => {
    const raw = JSON.stringify({
      state: {
        mode: 'countup',
        entries: [{ id: 'together-seed', label: 'Together', date: '2025-08-09' }],
      },
      version: 0,
    });
    expect(JSON.parse(withoutLocalCountUpEntries(raw) ?? '')).toEqual({
      state: { mode: 'countup' },
      version: 0,
    });
  });
});
