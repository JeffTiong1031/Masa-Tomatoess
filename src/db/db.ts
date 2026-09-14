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

export interface NoteRecord {
  id: string;
  owner: UserName;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  saved: boolean;
  binGroup: string | null;
  deletedAt: string | null;
}

export interface NoteFolderRecord {
  id: string;
  owner: UserName;
  parentId: string | null;
  name: string;
  colour: string;
  position: number;
  binGroup: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingNoteDelete {
  id: string;
  owner: UserName;
}

const db = new Dexie('PomodoroDB') as Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
  pendingMeals: EntityTable<PendingMeal, 'id'>;
  notes: EntityTable<NoteRecord, 'id'>;
  noteFolders: EntityTable<NoteFolderRecord, 'id'>;
  pendingNoteDeletes: EntityTable<PendingNoteDelete, 'id'>;
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

db.version(6).stores({
  sessions: '++id, date, mode, taskName, synced, userName',
  pendingMeals: '++id, date',
  notes: 'id, owner, updatedAt',
  pendingNoteDeletes: 'id, owner',
});

/* folderId and deletedAt are deliberately unindexed: IndexedDB skips rows
   whose indexed value is null, so a `where('folderId').equals(null)` query
   would silently miss every unfiled note -- which is most of them. saved is
   a boolean, which IndexedDB cannot index at all. Notes are few enough that
   one owner's rows are filtered in memory. */
db.version(7)
  .stores({
    sessions: '++id, date, mode, taskName, synced, userName',
    pendingMeals: '++id, date',
    notes: 'id, owner, updatedAt',
    noteFolders: 'id, owner',
    pendingNoteDeletes: 'id, owner',
  })
  .upgrade((tx) =>
    tx
      .table<NoteRecord>('notes')
      .toCollection()
      .modify((note) => {
        note.folderId = null;
        note.saved = true;
        note.binGroup = null;
        note.deletedAt = null;
      }),
  );

export { db };
