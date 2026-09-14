'use client';

import { Copy, FolderOpen, Minus, Save, Square, StickyNote, X } from 'lucide-react';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { accentVar } from '@/components/ui/PageShell';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import {
  clampNoteWindow,
  defaultNoteWindow,
  resizeNoteWindow,
  restoreNoteWindowAtPointer,
  type NoteWindowEdge,
} from '@/lib/noteWindow';
import { openTabs } from '@/lib/noteTabs';
import { useNotesDataStore } from '@/store/useNotesDataStore';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import { NotesPad, type NotesPadHandle } from './NotesPad';

const CONTROL_CLASS =
  'inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--mt-text-muted)]';

const MINIMISE_CLASS = `${CONTROL_CLASS} hover:bg-[color-mix(in_srgb,var(--mt-text)_10%,transparent)] hover:text-[var(--mt-text)]`;

const CLOSE_CLASS = `${CONTROL_CLASS} rounded-tr-2xl hover:bg-[var(--mt-danger)] hover:text-[var(--mt-danger-contrast)]`;

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

export function NotesWindow() {
  const mounted = useHasMounted();
  const isMdUp = useIsMdUp();
  const padRef = useRef<NotesPadHandle>(null);
  const notes = useNotesDataStore((state) => state.notes);
  const openIds = useNotesUiStore((state) => state.openIds);
  const activeId = useNotesUiStore((state) => state.activeId);
  const open = useNotesUiStore((state) => state.open);
  const minimised = useNotesUiStore((state) => state.minimised);
  const maximised = useNotesUiStore((state) => state.maximised);
  const box = useNotesUiStore((state) => state.box);
  const setOpen = useNotesUiStore((state) => state.setOpen);
  const setMinimised = useNotesUiStore((state) => state.setMinimised);
  const setBox = useNotesUiStore((state) => state.setBox);
  const maximise = useNotesUiStore((state) => state.maximise);
  const restoreFromMaximise = useNotesUiStore((state) => state.restoreFromMaximise);
  const tabs = openTabs(notes, openIds);
  const activeTitle =
    tabs.find((note) => note.id === activeId)?.title ??
    tabs[0]?.title ??
    'Nothing open';

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
    let origin = box;
    if (maximised) {
      origin = restoreNoteWindowAtPointer(
        box,
        startX,
        startY,
        window.innerWidth,
        window.innerHeight,
      );
      restoreFromMaximise(origin);
    }
    const move = (moveEvent: PointerEvent) => {
      setBox(
        clampNoteWindow(
          {
            ...origin,
            x: origin.x + moveEvent.clientX - startX,
            y: origin.y + moveEvent.clientY - startY,
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
    if (maximised) return;
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
      className={`fixed z-50 flex flex-col border border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text)] shadow-[0_14px_36px_rgba(0,0,0,0.18)] ${
        maximised ? 'rounded-none' : 'rounded-2xl'
      }`}
      style={{
        ['--mt-accent' as string]: accentVar('notes'),
        ...(maximised
          ? { inset: 0, width: '100%', height: '100%' }
          : {
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
            }),
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
        {/* Open and Save sit with the window controls, not in the strip
            below: they are things you do to the whole pad, the way
            minimise and close are, and the strip belongs to the words. */}
        <Link
          href="/notes"
          aria-label="Open a file"
          title="Open a file"
          className={MINIMISE_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <FolderOpen size={16} aria-hidden />
        </Link>
        <button
          type="button"
          aria-label="Save"
          title="Save (Ctrl+S)"
          className={MINIMISE_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => padRef.current?.save()}
        >
          <Save size={16} aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-[var(--mt-border)]" aria-hidden />
        <button
          type="button"
          aria-label="Minimise"
          className={MINIMISE_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setMinimised(true)}
        >
          <Minus size={18} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={maximised ? 'Restore' : 'Maximise'}
          className={MINIMISE_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => (maximised ? restoreFromMaximise() : maximise())}
        >
          {maximised ? (
            <Copy size={16} aria-hidden />
          ) : (
            <Square size={16} aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label="Close"
          className={CLOSE_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setOpen(false)}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <NotesPad ref={padRef} />
      </div>
      {!maximised &&
        EDGE_HANDLES.map((handle) => (
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
