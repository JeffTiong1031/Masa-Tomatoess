'use client';

import {
  Maximize2,
  Minus,
  MoveDiagonal2,
  StickyNote,
  X,
} from 'lucide-react';
import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import type { UserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import { clampNoteWindow, defaultNoteWindow } from '@/lib/noteWindow';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import { NotesPad } from './NotesPad';

interface NotesWindowProps {
  owner: UserName;
  notes: Note[];
  activeId: string;
  onNotes: (notes: Note[]) => void;
  onActiveId: (id: string) => void;
}

const CONTROL_CLASS =
  'inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--mt-text-muted)] hover:text-[var(--mt-text)]';

export function NotesWindow(props: NotesWindowProps) {
  const mounted = useHasMounted();
  const isMdUp = useIsMdUp();
  const open = useNotesUiStore((state) => state.open);
  const minimised = useNotesUiStore((state) => state.minimised);
  const box = useNotesUiStore((state) => state.box);
  const setOpen = useNotesUiStore((state) => state.setOpen);
  const setMinimised = useNotesUiStore((state) => state.setMinimised);
  const setBox = useNotesUiStore((state) => state.setBox);
  const activeTitle =
    props.notes.find((note) => note.id === props.activeId)?.title ??
    props.notes[0].title;

  useEffect(() => {
    if (mounted && isMdUp && box === null) {
      setBox(defaultNoteWindow(window.innerWidth, window.innerHeight));
    }
  }, [box, isMdUp, mounted, setBox]);

  if (!open || !isMdUp) return null;

  if (minimised) {
    return (
      <button
        type="button"
        className="fixed z-50 min-h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-[var(--mt-text)] shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
        style={{
          left: 'calc(var(--mt-safe-left) + 1rem)',
          bottom: 'calc(var(--mt-safe-bottom) + 1rem)',
        }}
        onClick={() => setMinimised(false)}
      >
        Notes · {activeTitle}
      </button>
    );
  }

  if (box === null) return null;

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = box;
    const move = (moveEvent: PointerEvent) => {
      setBox(
        clampNoteWindow(
          {
            ...start,
            x: start.x + moveEvent.clientX - startX,
            y: start.y + moveEvent.clientY - startY,
          },
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = box;
    const move = (moveEvent: PointerEvent) => {
      setBox(
        clampNoteWindow(
          {
            ...start,
            width: start.width + moveEvent.clientX - startX,
            height: start.height + moveEvent.clientY - startY,
          },
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <div
      role="dialog"
      aria-label="Notes"
      className="fixed z-50 flex flex-col rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text)] shadow-[0_14px_36px_rgba(0,0,0,0.18)]"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
      }}
    >
      <div
        className="flex min-h-11 shrink-0 touch-none select-none items-center border-b border-[var(--mt-border)] pl-3"
        onPointerDown={startDrag}
      >
        <StickyNote
          size={17}
          strokeWidth={1.9}
          className="mr-2 shrink-0"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          Notes
        </span>
        <button
          type="button"
          aria-label="Minimise"
          className={CONTROL_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setMinimised(true)}
        >
          <Minus size={18} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Enlarge"
          className={CONTROL_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() =>
            setBox(
              clampNoteWindow(
                {
                  ...box,
                  width: Math.min(window.innerWidth - 48, 640),
                  height: Math.min(window.innerHeight - 48, 720),
                },
                window.innerWidth,
                window.innerHeight,
              ),
            )
          }
        >
          <Maximize2 size={17} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Close"
          className={CONTROL_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setOpen(false)}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <NotesPad {...props} />
      </div>
      <button
        type="button"
        aria-label="Resize"
        className="absolute bottom-0 right-0 inline-flex min-h-11 min-w-11 touch-none items-end justify-end p-2 text-[var(--mt-text-muted)]"
        onPointerDown={startResize}
      >
        <MoveDiagonal2 size={16} aria-hidden />
      </button>
    </div>
  );
}
