import {
  MAX_EVENT_ROWS,
  MAX_NOTE_CHARS,
  MAX_TODO_ROWS,
  type CalendarSnapshot,
  type CalendarSnapshotRow,
  type TodoSnapshot,
  type TodoSnapshotRow,
} from './assistantContext';

export const MAX_MESSAGE_CHARS = 1_000;
export const MAX_HISTORY = 12;
export const MAX_TITLE_CHARS = 500;

export interface Message {
  role: 'you' | 'assistant';
  text: string;
}

export type ParsedBody = { ok: true; snapshot: TodoSnapshot; history: Message[] } | { ok: false };

function toRow(value: unknown): TodoSnapshotRow | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.handle !== 'string') return null;
  if (typeof raw.title !== 'string' || raw.title.length > MAX_TITLE_CHARS) return null;
  if (typeof raw.dueDate !== 'string' || typeof raw.dueTime !== 'string') return null;
  if (typeof raw.done !== 'boolean') return null;
  return {
    handle: raw.handle,
    title: raw.title,
    dueDate: raw.dueDate,
    dueTime: raw.dueTime,
    done: raw.done,
  };
}

function toSnapshot(value: unknown): TodoSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.today !== 'string' || typeof raw.weekday !== 'string') return null;
  if (typeof raw.now !== 'string' || !Array.isArray(raw.rows)) return null;
  if (raw.rows.length > MAX_TODO_ROWS) return null;

  const rows: TodoSnapshotRow[] = [];
  for (const entry of raw.rows) {
    const row = toRow(entry);
    if (row === null) return null;
    rows.push(row);
  }

  return { today: raw.today, weekday: raw.weekday, now: raw.now, rows };
}

export function parseHistory(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_HISTORY) return null;
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const raw = entry as Record<string, unknown>;
    if (raw.role !== 'you' && raw.role !== 'assistant') return null;
    if (typeof raw.text !== 'string' || raw.text.length > MAX_MESSAGE_CHARS) return null;
  }
  return value as Message[];
}

export function parseAssistantBody(value: unknown): ParsedBody {
  if (typeof value !== 'object' || value === null) return { ok: false };
  const raw = value as Record<string, unknown>;
  const snapshot = toSnapshot(raw.snapshot);
  const history = parseHistory(raw.history);
  if (snapshot === null || history === null) return { ok: false };
  return { ok: true, snapshot, history };
}

export type ParsedCalendarBody =
  | { ok: true; snapshot: CalendarSnapshot; history: Message[] }
  | { ok: false };

const CALENDAR_TEXT_FIELDS = [
  'handle',
  'date',
  'endDate',
  'startTime',
  'endTime',
  'category',
] as const;

function toCalendarRow(value: unknown): CalendarSnapshotRow | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  for (const field of CALENDAR_TEXT_FIELDS) {
    if (typeof raw[field] !== 'string') return null;
  }
  if (typeof raw.title !== 'string' || raw.title.length > MAX_TITLE_CHARS) return null;
  if (typeof raw.notes !== 'string' || raw.notes.length > MAX_NOTE_CHARS) return null;
  if (typeof raw.countdown !== 'boolean') return null;

  return {
    handle: raw.handle as string,
    title: raw.title,
    date: raw.date as string,
    endDate: raw.endDate as string,
    startTime: raw.startTime as string,
    endTime: raw.endTime as string,
    countdown: raw.countdown,
    category: raw.category as string,
    notes: raw.notes,
  };
}

function toCalendarSnapshot(value: unknown): CalendarSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.today !== 'string' || typeof raw.weekday !== 'string') return null;
  if (typeof raw.now !== 'string') return null;
  if (typeof raw.from !== 'string' || typeof raw.to !== 'string') return null;
  if (!Array.isArray(raw.categories) || !Array.isArray(raw.rows)) return null;
  if (raw.categories.some((name) => typeof name !== 'string')) return null;
  if (raw.rows.length > MAX_EVENT_ROWS) return null;

  const rows: CalendarSnapshotRow[] = [];
  for (const entry of raw.rows) {
    const row = toCalendarRow(entry);
    if (row === null) return null;
    rows.push(row);
  }

  return {
    today: raw.today,
    weekday: raw.weekday,
    now: raw.now,
    from: raw.from,
    to: raw.to,
    categories: raw.categories as string[],
    rows,
  };
}

export function parseCalendarBody(value: unknown): ParsedCalendarBody {
  if (typeof value !== 'object' || value === null) return { ok: false };
  const raw = value as Record<string, unknown>;
  const snapshot = toCalendarSnapshot(raw.snapshot);
  const history = parseHistory(raw.history);
  if (snapshot === null || history === null) return { ok: false };
  return { ok: true, snapshot, history };
}
