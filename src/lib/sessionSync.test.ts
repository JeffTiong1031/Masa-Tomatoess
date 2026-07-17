import { describe, expect, it } from 'vitest';
import {
  findMissingRemoteSessions,
  focusSessionKey,
  remoteToFingerprint,
  type RemoteFocusSession,
} from './sessionSync';

describe('focusSessionKey', () => {
  it('builds a stable fingerprint', () => {
    expect(
      focusSessionKey({
        userName: 'Jeff',
        completedAt: 1_700_000_000_000,
        durationMinutes: 25,
      })
    ).toBe('Jeff|1700000000000|25');
  });
});

describe('findMissingRemoteSessions', () => {
  const remotes: RemoteFocusSession[] = [
    {
      id: 'a',
      user_name: 'Jeff',
      duration_minutes: 25,
      task_name: null,
      created_at: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'b',
      user_name: 'Jeff',
      duration_minutes: 30,
      task_name: 'math',
      created_at: '2024-01-16T11:00:00.000Z',
    },
  ];

  it('returns all remotes when local is empty', () => {
    expect(findMissingRemoteSessions(remotes, new Set())).toHaveLength(2);
  });

  it('skips remotes that already exist locally', () => {
    const firstKey = focusSessionKey(remoteToFingerprint(remotes[0]));
    const missing = findMissingRemoteSessions(remotes, new Set([firstKey]));
    expect(missing).toHaveLength(1);
    expect(missing[0].id).toBe('b');
  });
});
