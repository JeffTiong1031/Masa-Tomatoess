'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoteLineGap } from '@/lib/noteLineGap';
import type { NoteWindowBox } from '@/lib/noteWindow';

interface NotesUiState {
  open: boolean;
  minimised: boolean;
  maximised: boolean;
  box: NoteWindowBox | null;
  restoreBox: NoteWindowBox | null;
  lineGapById: Record<string, NoteLineGap>;
  setOpen: (open: boolean) => void;
  setMinimised: (minimised: boolean) => void;
  setBox: (box: NoteWindowBox) => void;
  maximise: () => void;
  restoreFromMaximise: (box?: NoteWindowBox) => void;
  setLineGap: (id: string, gap: NoteLineGap) => void;
  clearLineGaps: (ids: string[]) => void;
}

export const useNotesUiStore = create<NotesUiState>()(
  persist(
    (set) => ({
      open: false,
      minimised: false,
      maximised: false,
      box: null,
      restoreBox: null,
      lineGapById: {},
      setOpen: (open) =>
        set(
          open
            ? { open: true, minimised: false }
            : { open: false, maximised: false },
        ),
      setMinimised: (minimised) =>
        set(minimised ? { minimised: true, maximised: false } : { minimised }),
      setBox: (box) => set({ box }),
      maximise: () =>
        set((state) =>
          state.maximised ? state : { maximised: true, restoreBox: state.box },
        ),
      restoreFromMaximise: (box) =>
        set((state) => ({
          maximised: false,
          box: box ?? state.restoreBox ?? state.box,
        })),
      setLineGap: (id, gap) =>
        set((state) => ({
          lineGapById: { ...state.lineGapById, [id]: gap },
        })),
      clearLineGaps: (ids) =>
        set((state) => {
          const lineGapById = { ...state.lineGapById };
          for (const id of ids) {
            delete lineGapById[id];
          }
          return { lineGapById };
        }),
    }),
    {
      name: 'mt-notes-ui',
      partialize: (state) => ({
        box: state.box,
        minimised: state.minimised,
        lineGapById: state.lineGapById,
      }),
    },
  ),
);
