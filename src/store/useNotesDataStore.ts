'use client';

import { create } from 'zustand';
import type { UserName } from '@/lib/identity';
import { titleOrDefault, type Note } from '@/lib/note';
import { binFolder, binNotes, groupIds, restoreGroup } from '@/lib/noteBin';
import {
  newFolder,
  nextFolderPosition,
  type NoteFolder,
} from '@/lib/noteFolder';
import {
  loadFolders,
  loadNotes,
  loadPendingDeletes,
  saveFolders,
  saveNote,
  saveNotes,
} from '@/lib/noteLocal';
import { mergeNotesAfterReconcile } from '@/lib/noteMerge';
import { dropNotes, newDraft, patchNotes } from '@/lib/notePad';
import { upsertFolders } from '@/lib/noteFolderRepo';
import { upsertNote } from '@/lib/noteRepo';
import { forgetFolders, forgetNote, reconcileNotes } from '@/lib/noteSync';

interface NotesDataState {
  owner: UserName | null;
  notes: Note[];
  folders: NoteFolder[];
  loaded: boolean;
  load: (owner: UserName) => Promise<void>;
  refresh: () => Promise<void>;
  createDraft: (folderId?: string | null) => string;
  editBody: (id: string, body: string) => void;
  writeNote: (note: Note) => Promise<void>;
  renameNote: (id: string, rawTitle: string) => Promise<void>;
  saveDraft: (id: string, rawTitle: string, folderId: string | null) => Promise<void>;
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  binNoteIds: (ids: string[]) => Promise<void>;
  restore: (group: string) => Promise<void>;
  forgetGroup: (group: string) => Promise<void>;
  addFolder: (
    name: string,
    colour: string,
    parentId: string | null,
  ) => Promise<string>;
  editFolder: (
    id: string,
    patch: { name?: string; colour?: string; parentId?: string | null },
  ) => Promise<void>;
  binFolderId: (id: string) => Promise<void>;
}

function now(): string {
  return new Date().toISOString();
}

async function pushNotes(notes: Note[]): Promise<void> {
  await saveNotes(notes);
  for (const note of notes) {
    if (note.saved) await upsertNote(note);
  }
}

async function pushFolders(folders: NoteFolder[]): Promise<void> {
  await saveFolders(folders);
  await upsertFolders(folders);
}

export const useNotesDataStore = create<NotesDataState>()((set, get) => ({
  owner: null,
  notes: [],
  folders: [],
  loaded: false,

  /* The pad and the files page can both ask on the same tick. Claiming
     the owner first means the second ask sees it and stands down instead
     of wiping the rows the first one is loading. */
  load: async (owner) => {
    if (get().owner === owner) return;
    set({ owner, loaded: false, notes: [], folders: [] });
    const [notes, folders] = await Promise.all([
      loadNotes(owner),
      loadFolders(owner),
    ]);
    if (get().owner !== owner) return;
    set({ notes, folders, loaded: true });
    await get().refresh();
  },

  refresh: async () => {
    const owner = get().owner;
    if (owner === null) return;
    const beforeIds = get().notes.map((note) => note.id);
    const reconciled = await reconcileNotes(owner, now());
    if (get().owner !== owner) return;
    const pending = await loadPendingDeletes(owner);
    if (get().owner !== owner) return;
    /* The pad may have been typed into while the cloud round trip was in
       flight, so the reconcile result is merged against what is on screen
       rather than replacing it. */
    set((state) => ({
      notes: mergeNotesAfterReconcile(
        state.notes,
        reconciled.notes,
        pending,
        beforeIds,
      ),
      folders: reconciled.folders,
      loaded: true,
    }));
  },

  /* Starting a note while looking at Recipes remembers Recipes, so the
     save box opens with the folder already chosen. It is still a draft:
     the folder is a suggestion until the note is saved. */
  createDraft: (folderId = null) => {
    const owner = get().owner;
    if (owner === null) return '';
    const draft = {
      ...newDraft(get().notes, owner, now(), crypto.randomUUID()),
      folderId,
    };
    set((state) => ({ notes: [...state.notes, draft] }));
    void saveNote(draft);
    return draft.id;
  },

  editBody: (id, body) => {
    const at = now();
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, body, updatedAt: at } : note,
      ),
    }));
  },

  writeNote: async (note) => {
    set((state) => ({ notes: patchNotes(state.notes, [note]) }));
    await pushNotes([note]);
  },

  renameNote: async (id, rawTitle) => {
    const found = get().notes.find((note) => note.id === id);
    if (found === undefined) return;
    const renamed = { ...found, title: titleOrDefault(rawTitle), updatedAt: now() };
    await get().writeNote(renamed);
  },

  saveDraft: async (id, rawTitle, folderId) => {
    const found = get().notes.find((note) => note.id === id);
    if (found === undefined) return;
    const saved = {
      ...found,
      title: titleOrDefault(rawTitle),
      folderId,
      saved: true,
      updatedAt: now(),
    };
    await get().writeNote(saved);
  },

  moveNote: async (id, folderId) => {
    const found = get().notes.find((note) => note.id === id);
    if (found === undefined || found.folderId === folderId) return;
    await get().writeNote({ ...found, folderId, updatedAt: now() });
  },

  /* Files go to the bin and can come back. Drafts were never saved
     anywhere, so there is nothing to restore them from and they go for
     good -- which is what the ask box has to have said first. */
  binNoteIds: async (ids) => {
    const owner = get().owner;
    if (owner === null) return;
    const wanted = new Set(ids);
    const picked = get().notes.filter((note) => wanted.has(note.id));
    const drafts = picked.filter((note) => !note.saved);
    const files = picked.filter((note) => note.saved);
    const binned = binNotes(files, ids, crypto.randomUUID(), now());
    const draftIds = drafts.map((note) => note.id);

    set((state) => ({
      notes: patchNotes(dropNotes(state.notes, draftIds), binned),
    }));

    for (const id of draftIds) {
      await forgetNote(id, owner, false);
    }
    await pushNotes(binned);
  },

  restore: async (group) => {
    const patch = restoreGroup(get().notes, get().folders, group, now());
    set((state) => ({
      notes: patchNotes(state.notes, patch.notes),
      folders: state.folders.map(
        (folder) =>
          patch.folders.find((back) => back.id === folder.id) ?? folder,
      ),
    }));
    await pushNotes(patch.notes);
    await pushFolders(patch.folders);
  },

  forgetGroup: async (group) => {
    const owner = get().owner;
    if (owner === null) return;
    const { noteIds, folderIds } = groupIds(get().notes, get().folders, group);
    const goneFolders = new Set(folderIds);
    set((state) => ({
      notes: dropNotes(state.notes, noteIds),
      folders: state.folders.filter((folder) => !goneFolders.has(folder.id)),
    }));
    for (const id of noteIds) {
      await forgetNote(id, owner);
    }
    await forgetFolders(folderIds);
  },

  addFolder: async (name, colour, parentId) => {
    const owner = get().owner;
    if (owner === null) return '';
    const made = newFolder(
      crypto.randomUUID(),
      owner,
      name,
      colour,
      parentId,
      nextFolderPosition(get().folders, parentId),
      now(),
    );
    set((state) => ({ folders: [...state.folders, made] }));
    await pushFolders([made]);
    return made.id;
  },

  editFolder: async (id, patch) => {
    const found = get().folders.find((folder) => folder.id === id);
    if (found === undefined) return;
    const next: NoteFolder = {
      ...found,
      name: patch.name === undefined ? found.name : patch.name.trim() || found.name,
      colour: patch.colour ?? found.colour,
      parentId: patch.parentId === undefined ? found.parentId : patch.parentId,
      updatedAt: now(),
    };
    set((state) => ({
      folders: state.folders.map((folder) => (folder.id === id ? next : folder)),
    }));
    await pushFolders([next]);
  },

  binFolderId: async (id) => {
    const patch = binFolder(
      get().folders,
      get().notes,
      id,
      crypto.randomUUID(),
      now(),
    );
    set((state) => ({
      notes: patchNotes(state.notes, patch.notes),
      folders: state.folders.map(
        (folder) =>
          patch.folders.find((hit) => hit.id === folder.id) ?? folder,
      ),
    }));
    await pushNotes(patch.notes);
    await pushFolders(patch.folders);
  },
}));
