'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  defaultNoteWindow,
  type NoteWindowBox,
} from '@/lib/noteWindow';

interface NotesUiState {
  open: boolean;
  minimised: boolean;
  box: NoteWindowBox | null;
  setOpen: (open: boolean) => void;
  setMinimised: (minimised: boolean) => void;
  setBox: (box: NoteWindowBox) => void;
}

export const useNotesUiStore = create<NotesUiState>()(
  persist(
    (set) => ({
      open: false,
      minimised: false,
      box: null,
      setOpen: (open) =>
        set(open ? { open: true, minimised: false } : { open: false }),
      setMinimised: (minimised) => set({ minimised }),
      setBox: (box) => set({ box }),
    }),
    { name: 'mt-notes-ui' },
  ),
);
