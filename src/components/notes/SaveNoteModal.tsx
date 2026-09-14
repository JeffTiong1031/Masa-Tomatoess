'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { NoteFolder } from '@/lib/noteFolder';
import FolderModal, { blankFolderDraft, type FolderDraft } from './FolderModal';
import FolderPicker from './FolderPicker';

export default function SaveNoteModal({
  open,
  folders,
  initialName,
  initialFolderId,
  onClose,
  onSave,
  onAddFolder,
}: {
  open: boolean;
  folders: NoteFolder[];
  initialName: string;
  initialFolderId: string | null;
  onClose: () => void;
  onSave: (name: string, folderId: string | null) => void;
  onAddFolder: (draft: FolderDraft) => Promise<string>;
}) {
  if (!open) return null;
  return (
    <SaveNoteModalOpen
      folders={folders}
      initialName={initialName}
      initialFolderId={initialFolderId}
      onClose={onClose}
      onSave={onSave}
      onAddFolder={onAddFolder}
    />
  );
}

function SaveNoteModalOpen({
  folders,
  initialName,
  initialFolderId,
  onClose,
  onSave,
  onAddFolder,
}: {
  folders: NoteFolder[];
  initialName: string;
  initialFolderId: string | null;
  onClose: () => void;
  onSave: (name: string, folderId: string | null) => void;
  onAddFolder: (draft: FolderDraft) => Promise<string>;
}) {
  const [name, setName] = useState(initialName);
  const [folderId, setFolderId] = useState(initialFolderId);
  const [makingFolder, setMakingFolder] = useState(false);

  return (
    <>
      <Modal
        open
        onClose={onClose}
        variant="sheet"
        title="Save this note"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 text-sm text-[var(--mt-text-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(name, folderId)}
              className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[var(--mt-text-muted)]">
            Give it a name and pick where it goes.
          </p>
          <label className="block text-xs font-semibold text-[var(--mt-text-muted)]">
            Name
            <input
              autoFocus
              value={name}
              placeholder="Chicken rice"
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base font-normal text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]"
            />
          </label>
          <FolderPicker
            label="Folder"
            folders={folders}
            value={folderId}
            noneLabel="No folder"
            onChange={setFolderId}
            onAddFolder={() => setMakingFolder(true)}
          />
        </div>
      </Modal>

      <FolderModal
        open={makingFolder}
        draft={blankFolderDraft(folderId)}
        folders={folders}
        onClose={() => setMakingFolder(false)}
        onSubmit={(draft) => {
          setMakingFolder(false);
          void onAddFolder(draft).then(setFolderId);
        }}
      />
    </>
  );
}
