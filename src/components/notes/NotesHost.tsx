'use client';

import { useEffect, useRef, useState } from 'react';
import { useHasMounted } from '@/hooks/useHasMounted';
import { isUserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import { isTypingTag, notesShortcut } from '@/lib/noteShortcut';
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

  useEffect(() => {
    if (owner === null) return;
    let active = true;
    void reconcileNotes(
      owner,
      new Date().toISOString(),
      crypto.randomUUID(),
    ).then((reconciled) => {
      if (!active) return;
      const storedId = localStorage.getItem(`mt-notes-active-${owner}`);
      setNotes(reconciled);
      setActiveId(
        reconciled.some((note) => note.id === storedId)
          ? storedId!
          : reconciled[0].id,
      );
    });
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
      setNotes(reconciled);
      setActiveId((current) =>
        reconciled.some((note) => note.id === current)
          ? current
          : reconciled[0].id,
      );
    });
    return () => {
      active = false;
    };
  }, [open, owner]);

  useEffect(() => {
    if (owner !== null && activeId !== '') {
      localStorage.setItem(`mt-notes-active-${owner}`, activeId);
    }
  }, [activeId, owner]);

  useEffect(() => {
    if (owner === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTag(
        (event.target as { tagName?: string }).tagName ?? '',
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

  if (owner === null || notes.length === 0) return null;

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
