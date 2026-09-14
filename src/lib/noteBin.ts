import type { Note } from './note';
import { folderAndDescendantIds, type NoteFolder } from './noteFolder';

export const BIN_KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BinPatch {
  notes: Note[];
  folders: NoteFolder[];
}

export function binnedNotes(notes: Note[]): Note[] {
  return notes
    .filter((note) => note.deletedAt !== null)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!));
}

export function binnedFolders(folders: NoteFolder[]): NoteFolder[] {
  return folders
    .filter((folder) => folder.deletedAt !== null)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!));
}

export function binNotes(
  notes: Note[],
  ids: string[],
  group: string,
  nowIso: string,
): Note[] {
  const wanted = new Set(ids);
  return notes
    .filter((note) => wanted.has(note.id) && note.deletedAt === null)
    .map((note) => ({
      ...note,
      binGroup: group,
      deletedAt: nowIso,
      updatedAt: nowIso,
    }));
}

/** One bin action, one group id, stamped on the folder, every folder under
 *  it and every note in any of them. That shared id is what lets a single
 *  Put back bring the whole subtree home instead of guessing from clocks. */
export function binFolder(
  folders: NoteFolder[],
  notes: Note[],
  folderId: string,
  group: string,
  nowIso: string,
): BinPatch {
  const ids = new Set(folderAndDescendantIds(folders, folderId));
  const hitFolders = folders
    .filter((folder) => ids.has(folder.id) && folder.deletedAt === null)
    .map((folder) => ({
      ...folder,
      binGroup: group,
      deletedAt: nowIso,
      updatedAt: nowIso,
    }));
  const hitNotes = notes
    .filter(
      (note) =>
        note.folderId !== null &&
        ids.has(note.folderId) &&
        note.deletedAt === null,
    )
    .map((note) => ({
      ...note,
      binGroup: group,
      deletedAt: nowIso,
      updatedAt: nowIso,
    }));
  return { notes: hitNotes, folders: hitFolders };
}

export interface FolderBinCost {
  files: number;
  folders: number;
}

export function folderBinCost(
  folders: NoteFolder[],
  notes: Note[],
  folderId: string,
): FolderBinCost {
  const ids = new Set(folderAndDescendantIds(folders, folderId));
  return {
    folders: ids.size - 1,
    files: notes.filter(
      (note) =>
        note.deletedAt === null &&
        note.folderId !== null &&
        ids.has(note.folderId),
    ).length,
  };
}

/** Restoring a note whose folder was swept for good drops it back outside
 *  any folder rather than pointing at a row that is not there. */
export function restoreGroup(
  notes: Note[],
  folders: NoteFolder[],
  group: string,
  nowIso: string,
): BinPatch {
  const restoredFolders = folders
    .filter((folder) => folder.deletedAt !== null && groupOf(folder) === group)
    .map((folder) => ({
      ...folder,
      binGroup: null,
      deletedAt: null,
      updatedAt: nowIso,
    }));

  const liveFolderIds = new Set([
    ...folders
      .filter((folder) => folder.deletedAt === null)
      .map((folder) => folder.id),
    ...restoredFolders.map((folder) => folder.id),
  ]);

  const restoredNotes = notes
    .filter((note) => note.deletedAt !== null && groupOf(note) === group)
    .map((note) => ({
      ...note,
      folderId:
        note.folderId !== null && liveFolderIds.has(note.folderId)
          ? note.folderId
          : null,
      binGroup: null,
      deletedAt: null,
      updatedAt: nowIso,
    }));

  return { notes: restoredNotes, folders: restoredFolders };
}

export interface BinEntry {
  kind: 'note' | 'folder';
  id: string;
  group: string;
  title: string;
  colour: string | null;
  deletedAt: string;
  inside: number;
}

/** What the bin lists. A folder and everything binned with it collapse to
 *  one row, because it was one action and putting it back is one action
 *  too. A note binned on its own is its own row. */
export function binEntries(notes: Note[], folders: NoteFolder[]): BinEntry[] {
  const gone = binnedFolders(folders);
  const inGroup = new Map<string, NoteFolder[]>();
  for (const folder of gone) {
    const key = groupOf(folder);
    const bucket = inGroup.get(key);
    if (bucket) bucket.push(folder);
    else inGroup.set(key, [folder]);
  }

  const entries: BinEntry[] = [];
  const covered = new Set<string>();

  for (const [group, members] of inGroup) {
    const ids = new Set(members.map((folder) => folder.id));
    const head =
      members.find(
        (folder) => folder.parentId === null || !ids.has(folder.parentId),
      ) ?? members[0];
    const insideNotes = notes.filter((note) => groupOf(note) === group);
    covered.add(group);
    entries.push({
      kind: 'folder',
      id: head.id,
      group,
      title: head.name,
      colour: head.colour,
      deletedAt: head.deletedAt!,
      inside: members.length - 1 + insideNotes.length,
    });
  }

  for (const note of binnedNotes(notes)) {
    const group = groupOf(note);
    if (covered.has(group)) continue;
    entries.push({
      kind: 'note',
      id: note.id,
      group,
      title: note.title,
      colour: null,
      deletedAt: note.deletedAt!,
      inside: 0,
    });
  }

  return entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

function groupOf(row: { id: string; binGroup: string | null }): string {
  return row.binGroup ?? row.id;
}

/** Everything one bin action swept up, for when the answer is "delete for
 *  good" rather than "put back". */
export function groupIds(
  notes: Note[],
  folders: NoteFolder[],
  group: string,
): { noteIds: string[]; folderIds: string[] } {
  const hit = (row: { id: string; binGroup: string | null; deletedAt: string | null }) =>
    row.deletedAt !== null && groupOf(row) === group;

  return {
    noteIds: notes.filter(hit).map((note) => note.id),
    folderIds: folders.filter(hit).map((folder) => folder.id),
  };
}

export function daysLeft(
  deletedAt: string,
  nowMs: number,
  keepDays = BIN_KEEP_DAYS,
): number {
  const elapsed = nowMs - Date.parse(deletedAt);
  return Math.max(0, Math.ceil((keepDays * DAY_MS - elapsed) / DAY_MS));
}

export function expiredBinIds(
  notes: Note[],
  folders: NoteFolder[],
  nowMs: number,
  keepDays = BIN_KEEP_DAYS,
): { noteIds: string[]; folderIds: string[] } {
  const gone = (deletedAt: string | null) =>
    deletedAt !== null && nowMs - Date.parse(deletedAt) >= keepDays * DAY_MS;

  return {
    noteIds: notes.filter((note) => gone(note.deletedAt)).map((n) => n.id),
    folderIds: folders
      .filter((folder) => gone(folder.deletedAt))
      .map((f) => f.id),
  };
}

export interface DeleteAsk {
  title: string;
  body: string;
  confirmLabel: string;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Drafts were never saved, so they cannot go to a bin; files can. A mixed
 *  pick has to say both, or Don't-save-able typing disappears silently. */
export function deleteAsk(files: Note[], drafts: Note[]): DeleteAsk {
  if (drafts.length === 0) {
    const title =
      files.length === 1 ? `Move "${files[0].title}" to bin?` : 'Move to bin?';
    return {
      title,
      body:
        files.length === 1
          ? 'You can bring it back later.'
          : `${plural(files.length, 'file', 'files')} go to the bin. You can bring them back later.`,
      confirmLabel: files.length === 1 ? 'Yes, bin it' : 'Yes, bin them',
    };
  }

  if (files.length === 0) {
    const title =
      drafts.length === 1
        ? `Delete "${drafts[0].title}"?`
        : 'Delete these notes?';
    return {
      title,
      body:
        drafts.length === 1
          ? 'It was never saved, so it will be gone for good.'
          : `${plural(drafts.length, 'note', 'notes')} were never saved, so they will be gone for good.`,
      confirmLabel: 'Delete',
    };
  }

  return {
    title: 'Delete these notes?',
    body: `${plural(files.length, 'file', 'files')} go to the bin. ${plural(
      drafts.length,
      'note',
      'notes',
    )} were never saved and will be gone for good.`,
    confirmLabel: 'Delete',
  };
}
