'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { FolderOpen, Save } from 'lucide-react';
import { accentVar } from '@/components/ui/PageShell';
import Modal from '@/components/ui/Modal';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import { NotesPad, type NotesPadHandle } from './NotesPad';

export function NotesSheet() {
  const isMdUp = useIsMdUp();
  const open = useNotesUiStore((state) => state.open);
  const setOpen = useNotesUiStore((state) => state.setOpen);
  const padRef = useRef<NotesPadHandle>(null);

  /* The phone sheet has no title bar of its own to hang these off, so
     Open and Save go in the footer, where a thumb already is. */
  return (
    <Modal
      open={open && !isMdUp}
      variant="sheet"
      title="Notes"
      maxWidthClass="max-w-lg"
      onClose={() => setOpen(false)}
      footer={
        <div
          className="flex items-center gap-2"
          style={{ ['--mt-accent' as string]: accentVar('notes') }}
        >
          <Link
            href="/notes"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text)]"
          >
            <FolderOpen size={16} aria-hidden />
            Open a file
          </Link>
          <button
            type="button"
            onClick={() => padRef.current?.save()}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            <Save size={16} aria-hidden />
            Save
          </button>
        </div>
      }
    >
      <div
        className="h-[60dvh]"
        style={{ ['--mt-accent' as string]: accentVar('notes') }}
      >
        <NotesPad ref={padRef} onLeave={() => setOpen(false)} />
      </div>
    </Modal>
  );
}
