import { db } from '@/db/db';
import { supabase } from './supabase';
import { clampDurationMinutes } from './sessionDuration';
import {
  dateStrFromCompletedAt,
  findMissingRemoteSessions,
  focusSessionKey,
  type RemoteFocusSession,
} from './sessionSync';

/** Upload unsynced local focus sessions to Supabase. */
export async function pushSessions() {
  try {
    const unsyncedSessions = await db.sessions
      .filter((session) => !session.synced && session.mode === 'focus')
      .toArray();

    if (unsyncedSessions.length === 0) return;

    const userName = localStorage.getItem('user_name');
    if (!userName) {
      console.warn('Cannot sync sessions without a user name.');
      return;
    }

    const payload = unsyncedSessions.map((session) => ({
      user_name: userName,
      duration_minutes: clampDurationMinutes(session.durationMinutes),
      task_name: (session.taskName || '').slice(0, 200).replace(/[<>]/g, '') || null,
      created_at: new Date(session.completedAt).toISOString(),
    }));

    const { error } = await supabase.from('focus_sessions').insert(payload);

    if (error) {
      console.error('Failed to sync to Supabase:', error);
      return;
    }

    const idsToUpdate = unsyncedSessions.map((s) => s.id!);
    await db.transaction('rw', db.sessions, async () => {
      for (const id of idsToUpdate) {
        await db.sessions.update(id, { synced: true, userName });
      }
    });

    console.log(`Pushed ${unsyncedSessions.length} sessions to Supabase.`);
  } catch (error) {
    console.error('Error during push sync:', error);
  }
}

/** Download this user's focus sessions from Supabase into Dexie. */
export async function pullSessions() {
  try {
    const userName = localStorage.getItem('user_name');
    if (!userName) {
      console.warn('Cannot pull sessions without a user name.');
      return;
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('id, user_name, duration_minutes, task_name, created_at')
      .eq('user_name', userName);

    if (error) {
      console.error('Failed to pull from Supabase:', error);
      return;
    }

    const remotes = (data || []) as RemoteFocusSession[];
    if (remotes.length === 0) return;

    const localFocus = await db.sessions
      .filter(
        (s) =>
          s.mode === 'focus' &&
          (s.userName === userName || !s.userName)
      )
      .toArray();

    const localKeys = new Set(
      localFocus.map((s) =>
        focusSessionKey({
          userName: s.userName || userName,
          completedAt: s.completedAt,
          durationMinutes: s.durationMinutes,
        })
      )
    );

    const missing = findMissingRemoteSessions(remotes, localKeys);
    if (missing.length === 0) {
      console.log('Pull sync: local already up to date.');
      return;
    }

    await db.sessions.bulkAdd(
      missing.map((remote) => {
        const completedAt = new Date(remote.created_at).getTime();
        return {
          date: dateStrFromCompletedAt(completedAt),
          durationMinutes: remote.duration_minutes,
          mode: 'focus' as const,
          completedAt,
          taskName: remote.task_name || undefined,
          synced: true,
          userName: remote.user_name,
        };
      })
    );

    console.log(`Pulled ${missing.length} sessions from Supabase.`);
  } catch (error) {
    console.error('Error during pull sync:', error);
  }
}

/** Push local → cloud, then pull cloud → local for the logged-in user. */
export async function syncSessions() {
  await pushSessions();
  await pullSessions();
}
