'use client';

import { useEffect } from 'react';
import { useHasMounted } from '@/hooks/useHasMounted';
import { isUserName } from '@/lib/identity';
import { isTypingElement, notesShortcut } from '@/lib/noteShortcut';
import { seedOpenIds } from '@/lib/noteTabs';
import { useNotesDataStore } from '@/store/useNotesDataStore';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import { NotesSheet } from './NotesSheet';
import { NotesWindow } from './NotesWindow';

export function NotesHost() {
  const mounted = useHasMounted();
  const ownerValue = mounted ? localStorage.getItem('user_name') : null;
  const owner = isUserName(ownerValue) ? ownerValue : null;
  const open = useNotesUiStore((state) => state.open);
  const setOpen = useNotesUiStore((state) => state.setOpen);
  const loadedFor = useNotesDataStore((state) => state.owner);
  const loaded = useNotesDataStore((state) => state.loaded);

  useEffect(() => {
    if (owner === null || loadedFor === owner) return;
    void useNotesDataStore.getState().load(owner);
  }, [owner, loadedFor]);

  /* First run after folders arrived: everything you already had becomes a
     file, and every one of them starts open, so the pad looks untouched.
     After that the tab strip is yours to empty. */
  useEffect(() => {
    if (!loaded || loadedFor === null) return;
    const ui = useNotesUiStore.getState();
    if (ui.seeded) return;
    ui.seedTabs(seedOpenIds(useNotesDataStore.getState().notes));
  }, [loaded, loadedFor]);

  useEffect(() => {
    if (open) void useNotesDataStore.getState().refresh();
  }, [open]);

  useEffect(() => {
    if (owner === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      /* A dialog inside the pad answers Escape first and says so. Without
         this, dismissing the save box would take the whole pad with it. */
      if (event.defaultPrevented) return;
      const target = event.target as {
        tagName?: string;
        isContentEditable?: boolean;
      };
      const typing = isTypingElement(
        target.tagName ?? '',
        target.isContentEditable === true,
      );
      const action = notesShortcut(
        event.key,
        typing,
        event.metaKey || event.ctrlKey || event.altKey,
      );
      if (action === 'open') setOpen(true);
      if (action === 'close') {
        if (open) event.preventDefault();
        const ui = useNotesUiStore.getState();
        if (ui.maximised) {
          ui.restoreFromMaximise();
          return;
        }
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, owner, setOpen]);

  if (owner === null) return null;

  return (
    <>
      <NotesSheet />
      <NotesWindow />
    </>
  );
}
