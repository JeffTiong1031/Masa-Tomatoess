'use client';

import { useState } from 'react';
import ColourWheel from '@/components/colour/ColourWheel';
import Modal from '@/components/ui/Modal';
import { STARTER_FILLS } from '@/lib/colourPalette';
import {
  DEFAULT_FOLDER_COLOUR,
  folderNameOrDefault,
  type NoteFolder,
} from '@/lib/noteFolder';
import FolderPicker from './FolderPicker';

export interface FolderDraft {
  id?: string;
  name: string;
  colour: string;
  parentId: string | null;
}

export function blankFolderDraft(parentId: string | null): FolderDraft {
  return { name: '', colour: DEFAULT_FOLDER_COLOUR, parentId };
}

export default function FolderModal({
  open,
  draft,
  folders,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: FolderDraft;
  folders: NoteFolder[];
  onClose: () => void;
  onSubmit: (draft: FolderDraft) => void;
}) {
  if (!open) return null;
  return (
    <FolderModalOpen
      draft={draft}
      folders={folders}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function FolderModalOpen({
  draft,
  folders,
  onClose,
  onSubmit,
}: {
  draft: FolderDraft;
  folders: NoteFolder[];
  onClose: () => void;
  onSubmit: (draft: FolderDraft) => void;
}) {
  const [name, setName] = useState(draft.name);
  const [colour, setColour] = useState(draft.colour);
  const [parentId, setParentId] = useState(draft.parentId);
  const [wheel, setWheel] = useState(false);
  const editing = draft.id !== undefined;

  return (
    <Modal
      open
      onClose={onClose}
      variant="sheet"
      title={editing ? 'Folder' : 'New folder'}
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
            onClick={() =>
              onSubmit({
                id: draft.id,
                name: folderNameOrDefault(name),
                colour,
                parentId,
              })
            }
            className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            {editing ? 'Save' : 'Make folder'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="block text-xs font-semibold text-[var(--mt-text-muted)]">
          Name
          <input
            autoFocus
            value={name}
            placeholder="Recipes"
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base font-normal text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]"
          />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--mt-text-muted)]">
            Colour
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {STARTER_FILLS.map((fill) => (
              <button
                key={fill}
                type="button"
                aria-label={`Colour ${fill}`}
                aria-pressed={colour.toUpperCase() === fill.toUpperCase()}
                onClick={() => setColour(fill)}
                className="size-11 rounded-full"
                style={{
                  background: fill,
                  outline:
                    colour.toUpperCase() === fill.toUpperCase()
                      ? '2px solid var(--mt-text)'
                      : undefined,
                  outlineOffset: '2px',
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setWheel((current) => !current)}
              className="min-h-11 rounded-xl border border-[var(--mt-border)] px-3 text-sm text-[var(--mt-text)]"
            >
              {wheel ? 'Done' : 'More colours'}
            </button>
          </div>
          {wheel && (
            <div className="mt-4">
              <ColourWheel value={colour} onChange={setColour} />
            </div>
          )}
        </div>

        <FolderPicker
          label="Inside"
          folders={folders}
          value={parentId}
          noneLabel="Nothing — top level"
          excludeId={draft.id}
          onChange={setParentId}
        />
      </div>
    </Modal>
  );
}
