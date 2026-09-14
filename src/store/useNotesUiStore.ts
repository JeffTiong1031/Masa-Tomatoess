'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoteSort } from '@/lib/noteFiles';
import type { NoteLineGap } from '@/lib/noteLineGap';
import type { NoteWindowBox } from '@/lib/noteWindow';
import { nextActiveId, withOpen, withoutOpen } from '@/lib/noteTabs';

interface NotesUiState {
  open: boolean;
  minimised: boolean;
  maximised: boolean;
  box: NoteWindowBox | null;
  restoreBox: NoteWindowBox | null;
  lineGapById: Record<string, NoteLineGap>;
  /** Tabs, in the order they were opened. Per device: which notes you have
   *  in front of you is not a fact about the note. */
  openIds: string[];
  activeId: string;
  /** Set once the first run has decided what to open, so a deliberately
   *  emptied tab strip is not re-filled on the next load. */
  seeded: boolean;
  sort: NoteSort;
  collapsed: Record<string, boolean>;
  setOpen: (open: boolean) => void;
  setMinimised: (minimised: boolean) => void;
  setBox: (box: NoteWindowBox) => void;
  maximise: () => void;
  restoreFromMaximise: (box?: NoteWindowBox) => void;
  setLineGap: (id: string, gap: NoteLineGap) => void;
  clearLineGaps: (ids: string[]) => void;
  openNote: (id: string) => void;
  closeNotes: (ids: string[]) => void;
  setActiveId: (id: string) => void;
  seedTabs: (ids: string[]) => void;
  setSort: (sort: NoteSort) => void;
  toggleCollapsed: (id: string) => void;
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
      openIds: [],
      activeId: '',
      seeded: false,
      sort: 'recent',
      collapsed: {},
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
      openNote: (id) =>
        set((state) => ({
          openIds: withOpen(state.openIds, id),
          activeId: id,
          open: true,
          minimised: false,
          seeded: true,
        })),
      closeNotes: (ids) =>
        set((state) => ({
          openIds: withoutOpen(state.openIds, ids),
          activeId: nextActiveId(state.openIds, ids, state.activeId),
          seeded: true,
        })),
      setActiveId: (activeId) => set({ activeId }),
      seedTabs: (ids) =>
        set((state) => ({
          openIds: ids,
          activeId: ids.includes(state.activeId) ? state.activeId : (ids[0] ?? ''),
          seeded: true,
        })),
      setSort: (sort) => set({ sort }),
      toggleCollapsed: (id) =>
        set((state) => ({
          collapsed: { ...state.collapsed, [id]: !state.collapsed[id] },
        })),
    }),
    {
      name: 'mt-notes-ui',
      partialize: (state) => ({
        box: state.box,
        minimised: state.minimised,
        lineGapById: state.lineGapById,
        openIds: state.openIds,
        activeId: state.activeId,
        seeded: state.seeded,
        sort: state.sort,
        collapsed: state.collapsed,
      }),
    },
  ),
);
