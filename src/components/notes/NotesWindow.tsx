'use client';

import { Minus, StickyNote, X } from 'lucide-react';
import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import type { UserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import {
  clampNoteWindow,
  defaultNoteWindow,
  resizeNoteWindow,
  type NoteWindowEdge,
} from '@/lib/noteWindow';
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

const EDGE_HANDLES: {
  edge: NoteWindowEdge;
  className: string;
  cursor: string;
  label: string;
}[] = [
  {
    edge: 'n',
    className: 'left-4 right-4 top-0 h-3',
    cursor: 'n-resize',
    label: 'Resize up',
  },
  {
    edge: 's',
    className: 'left-4 right-4 bottom-0 h-3',
    cursor: 's-resize',
    label: 'Resize down',
  },
  {
    edge: 'e',
    className: 'top-4 bottom-4 right-0 w-3',
    cursor: 'e-resize',
    label: 'Resize right',
  },
  {
    edge: 'w',
    className: 'top-4 bottom-4 left-0 w-3',
    cursor: 'w-resize',
    label: 'Resize left',
  },
  {
    edge: 'ne',
    className: 'right-0 top-0 h-4 w-4',
    cursor: 'ne-resize',
    label: 'Resize up and right',
  },
  {
    edge: 'nw',
    className: 'left-0 top-0 h-4 w-4',
    cursor: 'nw-resize',
    label: 'Resize up and left',
  },
  {
    edge: 'se',
    className: 'right-0 bottom-0 h-4 w-4',
    cursor: 'se-resize',
    label: 'Resize down and right',
  },
  {
    edge: 'sw',
    className: 'left-0 bottom-0 h-4 w-4',
    cursor: 'sw-resize',
    label: 'Resize down and left',
  },
];

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

  const startResize = (
    edge: NoteWindowEdge,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = box;
    const move = (moveEvent: PointerEvent) => {
      setBox(
        resizeNoteWindow(
          start,
          edge,
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
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
      {EDGE_HANDLES.map((handle) => (
        <button
          key={handle.edge}
          type="button"
          aria-label={handle.label}
          className={`absolute z-10 touch-none border-0 bg-transparent p-0 ${handle.className}`}
          style={{ cursor: handle.cursor }}
          onPointerDown={(event) => startResize(handle.edge, event)}
        />
      ))}
    </div>
  );
}
