import Dexie, { type EntityTable } from 'dexie';
import type { UserName } from '@/lib/identity';
import type { MealSlot } from '@/lib/meals';

export interface SessionRecord {
  id?: number;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  completedAt: number; // Unix timestamp
  taskName?: string;
  tagColor?: string;
  interruptions?: number;
  synced?: boolean;
  userName?: string;
}

export interface PendingMeal {
  id?: number;
  owner: UserName;
  date: string;
  atTime: string;
  slot: MealSlot;
  full: Blob;
  thumb: Blob;
  createdAt: number;
}

const db = new Dexie('PomodoroDB') as Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
  pendingMeals: EntityTable<PendingMeal, 'id'>;
};

// Schema definition
db.version(1).stores({
  sessions: '++id, date, mode', // Primary key and indexed props
});

db.version(2).stores({
  sessions: '++id, date, mode, taskName',
});

db.version(3).stores({
  sessions: '++id, date, mode, taskName, synced',
});

db.version(4).stores({
  sessions: '++id, date, mode, taskName, synced, userName',
});

db.version(5).stores({
  sessions: '++id, date, mode, taskName, synced, userName',
  pendingMeals: '++id, date',
});

export { db };
