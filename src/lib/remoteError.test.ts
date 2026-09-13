import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isOfflineRemoteError,
  logRemoteError,
  remoteErrorText,
} from './remoteError';

const SYNC = readFileSync(path.resolve(process.cwd(), 'src/lib/sync.ts'), 'utf8');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isOfflineRemoteError', () => {
  it('treats a dropped fetch as offline, not as a cloud bug', () => {
    expect(
      isOfflineRemoteError({
        code: '',
        message: 'TypeError: Failed to fetch',
        details:
          'TypeError: Failed to fetch\n    at async pullSessions',
      }),
    ).toBe(true);
  });

  it('treats an aborted request as offline', () => {
    expect(
      isOfflineRemoteError({ message: 'AbortError: The user aborted a request.' }),
    ).toBe(true);
  });

  it('leaves a real PostgREST failure as a real error', () => {
    expect(
      isOfflineRemoteError({
        code: '42P01',
        message: 'relation "focus_sessions" does not exist',
      }),
    ).toBe(false);
  });
});

describe('remoteErrorText', () => {
  it('keeps the code and message so Next.js does not print {}', () => {
    expect(
      remoteErrorText({
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
      }),
    ).toBe('PGRST116 — JSON object requested, multiple (or no) rows returned');
  });
});

describe('logRemoteError', () => {
  it('does not console.error a dropped fetch', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logRemoteError('Failed to pull from Supabase:', {
      message: 'TypeError: Failed to fetch',
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs a real cloud error as a string', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logRemoteError('Failed to pull from Supabase:', {
      code: '42501',
      message: 'permission denied',
    });
    expect(spy).toHaveBeenCalledWith(
      'Failed to pull from Supabase:',
      '42501 — permission denied',
    );
  });
});

describe('session sync', () => {
  it('logs pull and push failures through the offline-safe helper', () => {
    expect(SYNC).toContain('logRemoteError');
    expect(SYNC).not.toMatch(/console\.error\('Failed to pull from Supabase:', error\)/);
    expect(SYNC).not.toMatch(/console\.error\('Failed to sync to Supabase:', error\)/);
  });
});
