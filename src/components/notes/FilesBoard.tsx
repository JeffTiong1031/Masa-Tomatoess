'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';
import {
  FilePlus2,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import ConfirmDialog, { type ConfirmChoice } from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { useHasMounted } from '@/hooks/useHasMounted';
import { isUserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import { binEntries, deleteAsk, folderBinCost, type BinEntry } from '@/lib/noteBin';
import {
  countsByFolder,
  filesFor,
  dragTagShift,
  dragTagTitle,
  NOTE_SORT_LABEL,
  NOTE_SORTS,
} from '@/lib/noteFiles';
import { folderById, type NoteFolder } from '@/lib/noteFolder';
import { useNotesDataStore } from '@/store/useNotesDataStore';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import BinList from './BinList';
import FolderModal, { blankFolderDraft, type FolderDraft } from './FolderModal';
import FolderPicker from './FolderPicker';
import FolderRail, {
  ROOT_DROP_ID,
  type FilesPane,
} from './FolderRail';
import NoteCard, { NoteDragTag } from './NoteCard';

const tagByFinger: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) =>
  dragTagShift(
    transform,
    draggingNodeRect,
    activatorEvent === null ? null : getEventCoordinates(activatorEvent),
  );

interface Ask {
  title: string;
  body: string;
  choices: ConfirmChoice[];
}

function dropTargetFolderId(overId: string): string | null | undefined {
  if (overId === ROOT_DROP_ID) return null;
  if (overId.startsWith('folder:')) return overId.slice('folder:'.length);
  return undefined;
}

export default function FilesBoard() {
  const mounted = useHasMounted();
  const storedUser = mounted ? localStorage.getItem('user_name') : null;
  const owner = isUserName(storedUser) ? storedUser : null;

  const notes = useNotesDataStore((state) => state.notes);
  const folders = useNotesDataStore((state) => state.folders);
  const loaded = useNotesDataStore((state) => state.loaded);
  const loadedFor = useNotesDataStore((state) => state.owner);
  const load = useNotesDataStore((state) => state.load);

  const sort = useNotesUiStore((state) => state.sort);
  const setSort = useNotesUiStore((state) => state.setSort);
  const collapsed = useNotesUiStore((state) => state.collapsed);
  const toggleCollapsed = useNotesUiStore((state) => state.toggleCollapsed);
  const openNote = useNotesUiStore((state) => state.openNote);

  const [pane, setPane] = useState<FilesPane>({ kind: 'folder', id: null });
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<Note | null>(null);
  const [renaming, setRenaming] = useState<Note | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [moving, setMoving] = useState<Note | null>(null);
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (owner === null || loadedFor === owner) return;
    void load(owner);
  }, [owner, loadedFor, load]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const counts = countsByFolder(notes);
  const searching = query.trim() !== '';
  const paneFolderId = pane.kind === 'folder' ? pane.id : null;
  const paneFolder = folderById(folders, paneFolderId);
  const files = filesFor(notes, paneFolderId, sort, query);
  const binCount = binEntries(notes, folders).length;

  const newNoteHere = () => {
    const id = useNotesDataStore.getState().createDraft(paneFolderId);
    if (id !== '') openNote(id);
  };

  const submitFolder = async (draft: FolderDraft) => {
    const store = useNotesDataStore.getState();
    setFolderDraft(null);
    if (draft.id === undefined) {
      const id = await store.addFolder(draft.name, draft.colour, draft.parentId);
      setPane({ kind: 'folder', id });
      return;
    }
    await store.editFolder(draft.id, {
      name: draft.name,
      colour: draft.colour,
      parentId: draft.parentId,
    });
  };

  const askBinNote = (note: Note) => {
    const words = deleteAsk([note], []);
    setAsk({
      title: words.title,
      body: words.body,
      choices: [
        {
          label: words.confirmLabel,
          tone: 'danger',
          onPick: () => {
            setAsk(null);
            void useNotesDataStore.getState().binNoteIds([note.id]);
          },
        },
        { label: 'Keep it', tone: 'plain', onPick: () => setAsk(null) },
      ],
    });
  };

  const askBinFolder = (folder: NoteFolder) => {
    const cost = folderBinCost(folders, notes, folder.id);
    const inside =
      cost.files === 0 && cost.folders === 0
        ? 'It is empty.'
        : `Everything inside goes with it: ${cost.files} ${
            cost.files === 1 ? 'file' : 'files'
          }${cost.folders > 0 ? ` and ${cost.folders} ${cost.folders === 1 ? 'folder' : 'folders'}` : ''}.`;
    setAsk({
      title: `Move "${folder.name}" to bin?`,
      body: `${inside} You can bring it all back later.`,
      choices: [
        {
          label: 'Yes, bin it',
          tone: 'danger',
          onPick: () => {
            setAsk(null);
            setPane({ kind: 'folder', id: null });
            void useNotesDataStore.getState().binFolderId(folder.id);
          },
        },
        { label: 'Keep it', tone: 'plain', onPick: () => setAsk(null) },
      ],
    });
  };

  const askForget = (entry: BinEntry) => {
    setAsk({
      title: `Delete "${entry.title}" for good?`,
      body:
        entry.inside > 0
          ? `This and the ${entry.inside} things inside it cannot be brought back.`
          : 'This cannot be brought back.',
      choices: [
        {
          label: 'Delete for good',
          tone: 'danger',
          onPick: () => {
            setAsk(null);
            void useNotesDataStore.getState().forgetGroup(entry.group);
          },
        },
        { label: 'Cancel', tone: 'plain', onPick: () => setAsk(null) },
      ],
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const over = event.over;
    if (over === null) return;
    const folderId = dropTargetFolderId(String(over.id));
    if (folderId === undefined) return;
    void useNotesDataStore.getState().moveNote(String(event.active.id), folderId);
  };

  const tagTitle = dragTagTitle(notes, draggingId);

  if (owner === null) {
    return (
      <p className="text-sm text-[var(--mt-text-muted)]">
        {mounted ? 'Say who you are first.' : ''}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
        <FolderRail
          folders={folders}
          counts={counts}
          binCount={binCount}
          pane={pane}
          collapsed={collapsed}
          onPane={setPane}
          onToggleCollapsed={toggleCollapsed}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <div className="mt-soft p-2 flex flex-wrap items-center gap-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search notes by name</span>
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mt-text-muted)]"
              />
              <input
                value={query}
                placeholder="Search notes"
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)] pl-9 pr-3 text-sm text-[var(--mt-text)] focus:bg-[var(--mt-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]"
              />
            </label>

            <div
              className="flex shrink-0 items-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)] p-1"
              role="group"
              aria-label="Sort notes"
            >
              {NOTE_SORTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sort === option}
                  onClick={() => setSort(option)}
                  className={`min-h-11 rounded-[10px] px-3 text-sm ${
                    sort === option
                      ? 'bg-[var(--mt-surface)] font-semibold text-[var(--mt-text)] shadow-sm'
                      : 'text-[var(--mt-text-muted)]'
                  }`}
                >
                  {NOTE_SORT_LABEL[option]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFolderDraft(blankFolderDraft(paneFolderId))}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--mt-border)] px-3 text-sm font-semibold text-[var(--mt-text)]"
            >
              <FolderPlus size={16} aria-hidden />
              Folder
            </button>
            <button
              type="button"
              onClick={newNoteHere}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--mt-accent)] px-3 text-sm font-semibold text-[var(--mt-accent-contrast)]"
            >
              <FilePlus2 size={16} aria-hidden />
              New note
            </button>
          </div>

          {pane.kind === 'bin' ? (
            <BinList
              notes={notes}
              folders={folders}
              nowMs={nowMs}
              onRestore={(entry) =>
                void useNotesDataStore.getState().restore(entry.group)
              }
              onForget={askForget}
            />
          ) : (
            <>
              <div className="flex min-h-11 items-center gap-2.5">
                <h2 className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-[var(--mt-text)]">
                  {paneFolder !== null && (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: paneFolder.colour }}
                      aria-hidden
                    />
                  )}
                  <span className="truncate">
                    {searching
                      ? 'Search'
                      : (paneFolder?.name ?? 'Not in a folder')}
                  </span>
                </h2>
                <span className="inline-flex items-center justify-center rounded-full bg-[var(--mt-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--mt-text-muted)]">
                  {files.length}
                </span>
                {paneFolder !== null && !searching && (
                  <span className="ml-auto flex items-center">
                    <button
                      type="button"
                      aria-label={`Edit ${paneFolder.name}`}
                      onClick={() =>
                        setFolderDraft({
                          id: paneFolder.id,
                          name: paneFolder.name,
                          colour: paneFolder.colour,
                          parentId: paneFolder.parentId,
                        })
                      }
                      className="inline-flex size-11 items-center justify-center rounded-lg text-[var(--mt-text-muted)]"
                    >
                      <Pencil size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${paneFolder.name} to bin`}
                      onClick={() => askBinFolder(paneFolder)}
                      className="inline-flex size-11 items-center justify-center rounded-lg text-[var(--mt-text-muted)]"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </span>
                )}
              </div>

              {files.length === 0 ? (
                <div className="mt-soft grid place-items-center gap-2 px-6 py-16 text-center">
                  <p className="text-sm font-semibold text-[var(--mt-text)]">
                    {searching
                      ? 'No note by that name'
                      : loaded
                        ? 'Nothing here yet'
                        : 'Looking…'}
                  </p>
                  {!searching && loaded && (
                    <button
                      type="button"
                      onClick={newNoteHere}
                      className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
                    >
                      Write one
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {files.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      folder={folderById(folders, note.folderId)}
                      nowMs={nowMs}
                      showFolderName={searching}
                      onOpen={() => openNote(note.id)}
                      onMenu={() => setMenuFor(note)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        variant="sheet"
        title={menuFor?.title ?? ''}
        maxWidthClass="max-w-sm"
      >
        <div className="flex flex-col">
          {[
            {
              label: 'Open',
              run: () => menuFor !== null && openNote(menuFor.id),
            },
            {
              label: 'Rename',
              run: () => {
                setRenameDraft(menuFor?.title ?? '');
                setRenaming(menuFor);
              },
            },
            { label: 'Move to…', run: () => setMoving(menuFor) },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                const note = menuFor;
                setMenuFor(null);
                if (note !== null) item.run();
              }}
              className="flex min-h-12 items-center rounded-xl px-3 text-left text-sm text-[var(--mt-text)]"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const note = menuFor;
              setMenuFor(null);
              if (note !== null) askBinNote(note);
            }}
            className="flex min-h-12 items-center rounded-xl px-3 text-left text-sm text-[var(--mt-danger)]"
          >
            Move to bin
          </button>
        </div>
      </Modal>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        variant="sheet"
        title="Rename"
        maxWidthClass="max-w-sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenaming(null)}
              className="min-h-11 rounded-xl px-4 text-sm text-[var(--mt-text-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const note = renaming;
                setRenaming(null);
                if (note !== null) {
                  void useNotesDataStore
                    .getState()
                    .renameNote(note.id, renameDraft);
                }
              }}
              className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
            >
              Save
            </button>
          </div>
        }
      >
        <label className="block text-xs font-semibold text-[var(--mt-text-muted)]">
          Name
          <input
            autoFocus
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base font-normal text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]"
          />
        </label>
      </Modal>

      <Modal
        open={moving !== null}
        onClose={() => setMoving(null)}
        variant="sheet"
        title="Move to"
        maxWidthClass="max-w-sm"
      >
        <FolderPicker
          label="Folder"
          folders={folders}
          value={moving?.folderId ?? null}
          noneLabel="No folder"
          onChange={(id) => {
            const note = moving;
            setMoving(null);
            if (note !== null) {
              void useNotesDataStore.getState().moveNote(note.id, id);
            }
          }}
        />
      </Modal>

      <FolderModal
        open={folderDraft !== null}
        draft={folderDraft ?? blankFolderDraft(null)}
        folders={folders}
        onClose={() => setFolderDraft(null)}
        onSubmit={(draft) => void submitFolder(draft)}
      />

      <ConfirmDialog
        open={ask !== null}
        title={ask?.title ?? ''}
        body={ask?.body}
        choices={ask?.choices ?? []}
        onDismiss={() => setAsk(null)}
      />

      <DragOverlay dropAnimation={null} modifiers={[tagByFinger]}>
        {tagTitle !== null ? <NoteDragTag title={tagTitle} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
