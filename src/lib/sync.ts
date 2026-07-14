import { db } from '@/db/db';
import { supabase } from './supabase';

export async function syncSessions() {
  try {
    // We only care about focus sessions
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
      duration_minutes: Math.min(Math.max(1, session.durationMinutes), 120),
      task_name: (session.taskName || '').slice(0, 200).replace(/[<>]/g, '') || null,
      created_at: new Date(session.completedAt).toISOString(),
    }));

    const { error } = await supabase.from('focus_sessions').insert(payload);

    if (error) {
      console.error('Failed to sync to Supabase:', error);
      return;
    }

    // Mark as synced in Dexie
    const idsToUpdate = unsyncedSessions.map((s) => s.id!);
    await db.transaction('rw', db.sessions, async () => {
      for (const id of idsToUpdate) {
        await db.sessions.update(id, { synced: true });
      }
    });

    console.log(`Synced ${unsyncedSessions.length} sessions to Supabase.`);
  } catch (error) {
    console.error('Error during background sync:', error);
  }
}
