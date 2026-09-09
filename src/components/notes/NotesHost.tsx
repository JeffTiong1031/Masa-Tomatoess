'use client';

import { useEffect, useRef, useState } from 'react';
import { useHasMounted } from '@/hooks/useHasMounted';
import { isUserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import { loadNotes } from '@/lib/noteLocal';
import { mergeNotes } from '@/lib/noteMerge';
import { isActiveNoteOwnedBy } from '@/lib/notePad';
import { isTypingElement, notesShortcut } from '@/lib/noteShortcut';
import { reconcileNotes } from '@/lib/noteSync';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import { NotesSheet } from './NotesSheet';
import { NotesWindow } from './NotesWindow';

export function NotesHost() {
  const mounted = useHasMounted();
  const ownerValue = mounted ? localStorage.getItem('user_name') : null;
  const owner = isUserName(ownerValue) ? ownerValue : null;
  const open = useNotesUiStore((state) => state.open);
  const setOpen = useNotesUiStore((state) => state.setOpen);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState('');
  const previousOpen = useRef(open);
  const activeNoteOwned =
    owner !== null && isActiveNoteOwnedBy(notes, activeId, owner);

  useEffect(() => {
    if (owner === null) return;
    let active = true;
    void loadNotes(owner)
      .then((local) => {
        if (!active) return;
        const storedId = localStorage.getItem(`mt-notes-active-${owner}`);
        setNotes(local);
        if (local.length > 0) {
          setActiveId(
            local.some((note) => note.id === storedId)
              ? storedId!
              : local[0].id,
          );
        }
        reconcileNotes(
          owner,
          new Date().toISOString(),
          crypto.randomUUID(),
        )
          .then((reconciled) => {
            if (!active) return;
            setNotes((current) => mergeNotes(current, reconciled, []));
            setActiveId((current) =>
              reconciled.some((note) => note.id === current)
                ? current
                : reconciled[0].id,
            );
          })
          .catch(console.error);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [owner]);

  useEffect(() => {
    const becameOpen = open && !previousOpen.current;
    previousOpen.current = open;
    if (owner === null || !becameOpen) return;
    let active = true;
    void reconcileNotes(
      owner,
      new Date().toISOString(),
      crypto.randomUUID(),
    ).then((reconciled) => {
      if (!active) return;
      setNotes((current) => mergeNotes(current, reconciled, []));
      setActiveId((current) =>
        reconciled.some((note) => note.id === current)
          ? current
          : reconciled[0].id,
      );
    }).catch(console.error);
    return () => {
      active = false;
    };
  }, [open, owner]);

  useEffect(() => {
    if (owner !== null && activeNoteOwned) {
      localStorage.setItem(`mt-notes-active-${owner}`, activeId);
    }
  }, [activeId, activeNoteOwned, owner]);

  useEffect(() => {
    if (owner === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
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
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, owner, setOpen]);

  if (owner === null || !activeNoteOwned) return null;

  const props = {
    owner,
    notes,
    activeId,
    onNotes: setNotes,
    onActiveId: setActiveId,
  };

  return (
    <>
      <NotesSheet {...props} />
      <NotesWindow {...props} />
    </>
  );
}
