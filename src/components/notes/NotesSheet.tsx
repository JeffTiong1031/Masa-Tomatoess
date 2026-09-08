'use client';

import Modal from '@/components/ui/Modal';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import type { UserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import { NotesPad } from './NotesPad';

interface NotesSheetProps {
  owner: UserName;
  notes: Note[];
  activeId: string;
  onNotes: (notes: Note[]) => void;
  onActiveId: (id: string) => void;
}

export function NotesSheet(props: NotesSheetProps) {
  const isMdUp = useIsMdUp();
  const open = useNotesUiStore((state) => state.open);
  const setOpen = useNotesUiStore((state) => state.setOpen);

  return (
    <Modal
      open={open && !isMdUp}
      variant="sheet"
      title="Notes"
      maxWidthClass="max-w-lg"
      onClose={() => setOpen(false)}
    >
      <div className="h-[60dvh]">
        <NotesPad {...props} />
      </div>
    </Modal>
  );
}
