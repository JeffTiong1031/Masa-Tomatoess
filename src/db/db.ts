import Dexie, { type EntityTable } from 'dexie';

export interface SessionRecord {
  id?: number;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  completedAt: number; // Unix timestamp
  taskName?: string;
  tagColor?: string;
  interruptions?: number;
}

const db = new Dexie('PomodoroDB') as Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
};

// Schema definition
db.version(1).stores({
  sessions: '++id, date, mode', // Primary key and indexed props
});

db.version(2).stores({
  sessions: '++id, date, mode, taskName',
});

export { db };
