import { decodeBody } from './noteDoc';
import { isLive, type Note } from './note';

export const NOTE_SORTS = ['recent', 'name'] as const;
export type NoteSort = (typeof NOTE_SORTS)[number];

export const NOTE_SORT_LABEL: Record<NoteSort, string> = {
  recent: 'Latest',
  name: 'A–Z',
};

export function isNoteSort(value: string): value is NoteSort {
  return NOTE_SORTS.includes(value as NoteSort);
}

/** Files, not drafts: the files page only ever shows what was saved. */
export function savedNotes(notes: Note[]): Note[] {
  return notes.filter((note) => note.saved && isLive(note));
}

export function draftNotes(notes: Note[]): Note[] {
  return notes.filter((note) => !note.saved && isLive(note));
}

export function sortNotes(notes: Note[], sort: NoteSort): Note[] {
  const copy = [...notes];
  switch (sort) {
    case 'recent':
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'name':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
}

export function matchesQuery(note: Note, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return note.title.toLowerCase().includes(needle);
}

/** A search reaches across every folder, because the whole point of
 *  typing a name is that you have forgotten where you put it. */
export function filesFor(
  notes: Note[],
  folderId: string | null,
  sort: NoteSort,
  query: string,
): Note[] {
  const searching = query.trim() !== '';
  const pool = savedNotes(notes).filter((note) =>
    searching ? matchesQuery(note, query) : note.folderId === folderId,
  );
  return sortNotes(pool, sort);
}

export function countsByFolder(notes: Note[]): Map<string | null, number> {
  const counts = new Map<string | null, number>();
  for (const note of savedNotes(notes)) {
    counts.set(note.folderId, (counts.get(note.folderId) ?? 0) + 1);
  }
  return counts;
}

export interface PreviewLine {
  text: string;
  checked: boolean | null;
}

/** What a card shows under its name. Checklists keep their boxes, because
 *  a list of ticks is how you recognise a shopping list at a glance. */
export function notePreview(body: string, limit = 4): PreviewLine[] {
  return decodeBody(body)
    .map((block) => ({
      text: block.text.trim(),
      checked: block.kind === 'item' ? block.checked : null,
    }))
    .filter((line) => line.text !== '' || line.checked !== null)
    .slice(0, limit);
}

/** The save box pre-fills from the first words you actually typed. */
export function suggestedTitle(body: string): string {
  const first = notePreview(body, 1)[0];
  if (first === undefined) return '';
  return first.text.slice(0, 60).trim();
}