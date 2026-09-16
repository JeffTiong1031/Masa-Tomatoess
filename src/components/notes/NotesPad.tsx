'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import ConfirmDialog, { type ConfirmChoice } from '@/components/ui/ConfirmDialog';
import { NOTE_SAVE_PAUSE_MS, type Note } from '@/lib/note';
import { deleteAsk } from '@/lib/noteBin';
import { suggestedTitle } from '@/lib/noteFiles';
import { folderById } from '@/lib/noteFolder';
import { DEFAULT_NOTE_LINE_GAP } from '@/lib/noteLineGap';
import { isSaveShortcut } from '@/lib/noteShortcut';
import { openTabs } from '@/lib/noteTabs';
import { useNotesDataStore } from '@/store/useNotesDataStore';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import {
  NotesEditor,
  type NotesCaretInfo,
  type NotesEditorHandle,
} from './NotesEditor';
import { NotesStrip } from './NotesStrip';
import SaveNoteModal from './SaveNoteModal';

export interface NotesPadHandle {
  save: () => void;
}

interface Ask {
  title: string;
  body: string;
  choices: ConfirmChoice[];
}

export const NotesPad = forwardRef<NotesPadHandle, { onLeave?: () => void }>(
  function NotesPad({ onLeave }, ref) {
    const notes = useNotesDataStore((state) => state.notes);
    const folders = useNotesDataStore((state) => state.folders);
    const openIds = useNotesUiStore((state) => state.openIds);
    const activeId = useNotesUiStore((state) => state.activeId);
    const setActiveId = useNotesUiStore((state) => state.setActiveId);
    const openNote = useNotesUiStore((state) => state.openNote);
    const closeNotes = useNotesUiStore((state) => state.closeNotes);
    const lineGapById = useNotesUiStore((state) => state.lineGapById);
    const setLineGap = useNotesUiStore((state) => state.setLineGap);
    const clearLineGaps = useNotesUiStore((state) => state.clearLineGaps);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [selecting, setSelecting] = useState(false);
    const [picked, setPicked] = useState<Record<string, boolean>>({});
    const [saveBox, setSaveBox] = useState<Note | null>(null);
    const [ask, setAsk] = useState<Ask | null>(null);
    const [flash, setFlash] = useState(false);
    const [strip, setStrip] = useState<NotesCaretInfo>({
      inWords: false,
      inChecklist: false,
      canIndent: false,
      canOutdent: false,
      bold: false,
      underline: false,
    });

    const editorRef = useRef<NotesEditorHandle>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingSave = useRef<Note | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const tabs = openTabs(notes, openIds);
    const active = tabs.find((note) => note.id === activeId) ?? tabs[0] ?? null;
    const lineGap =
      active === null
        ? DEFAULT_NOTE_LINE_GAP
        : ((lineGapById ?? {})[active.id] ?? DEFAULT_NOTE_LINE_GAP);
    const pickedIds = tabs.filter((note) => picked[note.id]).map((note) => note.id);

    const flushPendingSave = useCallback(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const pending = pendingSave.current;
      saveTimer.current = null;
      pendingSave.current = null;
      if (pending) void useNotesDataStore.getState().writeNote(pending);
    }, []);

    useEffect(() => () => flushPendingSave(), [flushPendingSave]);

    useEffect(
      () => () => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
      },
      [],
    );

    const showFlash = useCallback(() => {
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 1600);
    }, []);

    /* A file writes itself as you type, so Ctrl+S has nothing left to do
       but say so. A draft has never been given a name or a place, and
       that is exactly what the box asks for. */
    const requestSave = useCallback(() => {
      if (active === null) return;
      flushPendingSave();
      if (active.saved) {
        showFlash();
        return;
      }
      setSaveBox(active);
    }, [active, flushPendingSave, showFlash]);

    useImperativeHandle(ref, () => ({ save: requestSave }), [requestSave]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!isSaveShortcut(event.key, event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        requestSave();
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [requestSave]);

    const startRename = (note: Note) => {
      flushPendingSave();
      setEditingId(note.id);
      setName(note.title);
    };

    const commitRename = (note: Note) => {
      flushPendingSave();
      setEditingId(null);
      void useNotesDataStore.getState().renameNote(note.id, name);
    };

    const createNote = () => {
      flushPendingSave();
      const id = useNotesDataStore.getState().createDraft();
      if (id !== '') openNote(id);
    };

    const forgetTabs = (ids: string[]) => {
      flushPendingSave();
      void useNotesDataStore.getState().binNoteIds(ids);
      closeNotes(ids);
      clearLineGaps(ids);
      setPicked({});
      setSelecting(false);
    };

    /* Closing is not deleting. A file is on the files page either way, so
       its tab just goes; a draft exists nowhere else, so shutting it would
       throw the typing away without saying so. */
    const closeTab = (note: Note) => {
      if (note.saved) {
        flushPendingSave();
        closeNotes([note.id]);
        return;
      }
      setAsk({
        title: 'Save this note first?',
        body: 'It has never been saved, so closing it now throws it away.',
        choices: [
          {
            label: 'Save',
            tone: 'primary',
            onPick: () => {
              setAsk(null);
              flushPendingSave();
              setSaveBox(note);
            },
          },
          {
            label: "Don't save",
            tone: 'danger',
            onPick: () => {
              setAsk(null);
              forgetTabs([note.id]);
            },
          },
          { label: 'Cancel', tone: 'quiet', onPick: () => setAsk(null) },
        ],
      });
    };

    const deletePicked = () => {
      if (pickedIds.length === 0) return;
      const wanted = new Set(pickedIds);
      const chosen = tabs.filter((note) => wanted.has(note.id));
      const words = deleteAsk(
        chosen.filter((note) => note.saved),
        chosen.filter((note) => !note.saved),
      );
      setAsk({
        title: words.title,
        body: words.body,
        choices: [
          {
            label: words.confirmLabel,
            tone: 'danger',
            onPick: () => {
              setAsk(null);
              forgetTabs(pickedIds);
            },
          },
          { label: 'Cancel', tone: 'plain', onPick: () => setAsk(null) },
        ],
      });
    };

    const updateBody = (body: string) => {
      if (active === null) return;
      useNotesDataStore.getState().editBody(active.id, body);
      /* Read the state again rather than reusing the snapshot from before
         the edit: that one still holds the previous keystroke, and it is
         the row that would be written to disk. */
      const updated = useNotesDataStore
        .getState()
        .notes.find((note) => note.id === active.id);
      if (updated === undefined) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      pendingSave.current = updated;
      saveTimer.current = setTimeout(flushPendingSave, NOTE_SAVE_PAUSE_MS);
    };

    const activeFolder =
      active === null ? null : folderById(folders, active.folderId);
    const savedWhere =
      activeFolder === null ? 'Saved' : `Saved in ${activeFolder.name}`;
    const status =
      active === null ? null : active.saved ? (
        <span className="truncate text-xs text-[var(--mt-text-muted)]">
          {flash ? 'Saved just now' : savedWhere}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--mt-text-muted)]">
          <span
            className="size-1.5 rounded-full bg-[var(--mt-danger)]"
            aria-hidden
          />
          Not saved yet
        </span>
      );

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-11 shrink-0 items-center overflow-x-auto border-b border-[var(--mt-border)]">
          {tabs.map((note) => {
            const isActive = note.id === active?.id;
            return (
              <div
                key={note.id}
                className={`flex shrink-0 items-center ${
                  isActive ? 'bg-[var(--mt-accent)]' : ''
                }`}
              >
                {selecting && (
                  <label className="flex min-h-11 min-w-11 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${note.title}`}
                      className="h-3.5 w-3.5 accent-[var(--mt-text)]"
                      checked={Boolean(picked[note.id])}
                      onChange={() =>
                        setPicked((current) => ({
                          ...current,
                          [note.id]: !current[note.id],
                        }))
                      }
                    />
                  </label>
                )}
                {editingId === note.id ? (
                  <input
                    aria-label="Note name"
                    autoFocus
                    className="min-h-11 min-w-11 bg-transparent px-3 text-[var(--mt-text)] outline-none"
                    value={name}
                    onBlur={() => commitRename(note)}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename(note);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="flex min-h-11 min-w-11 items-center gap-1.5 px-3 text-[var(--mt-text)]"
                    onClick={() => {
                      if (selecting) {
                        setPicked((current) => ({
                          ...current,
                          [note.id]: !current[note.id],
                        }));
                        return;
                      }
                      if (isActive) startRename(note);
                      else {
                        flushPendingSave();
                        setActiveId(note.id);
                      }
                    }}
                    onDoubleClick={() => {
                      if (!selecting) startRename(note);
                    }}
                  >
                    {!note.saved && (
                      <span
                        aria-label="Not saved"
                        className="size-1.5 shrink-0 rounded-full bg-[var(--mt-danger)]"
                      />
                    )}
                    {note.title}
                  </button>
                )}
                {isActive && !selecting && (
                  <button
                    type="button"
                    aria-label={`Close ${note.title}`}
                    className="min-h-11 min-w-11 text-[var(--mt-text)]"
                    onClick={() => closeTab(note)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            aria-label="New note"
            className="min-h-11 min-w-11 shrink-0 text-[var(--mt-text)]"
            onClick={createNote}
          >
            +
          </button>
        </div>

        {active === null ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-[var(--mt-text-muted)]">
              Nothing open.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/notes"
                onClick={onLeave}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
              >
                <FolderOpen size={16} aria-hidden />
                Open a file
              </Link>
              <button
                type="button"
                onClick={createNote}
                className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
              >
                New note
              </button>
            </div>
          </div>
        ) : (
          <>
            <NotesStrip
              status={status}
              inWords={strip.inWords}
              inChecklist={strip.inChecklist}
              canIndent={strip.canIndent}
              canOutdent={strip.canOutdent}
              bold={strip.bold}
              underline={strip.underline}
              lineGap={lineGap}
              selecting={selecting}
              canDeletePicked={pickedIds.length > 0}
              onToggle={() => editorRef.current?.toggle()}
              onBold={() => editorRef.current?.bold()}
              onUnderline={() => editorRef.current?.underline()}
              onInsertPicture={() => editorRef.current?.insertPicture()}
              onIndent={() => editorRef.current?.indent()}
              onOutdent={() => editorRef.current?.outdent()}
              onLineGap={(gap) => setLineGap(active.id, gap)}
              onSelect={() => {
                setSelecting((current) => !current);
                setPicked({});
              }}
              onDeletePicked={deletePicked}
            />
            <NotesEditor
              key={active.id}
              ref={editorRef}
              body={active.body}
              lineGap={lineGap}
              onChange={updateBody}
              onCaret={setStrip}
            />
          </>
        )}

        <SaveNoteModal
          open={saveBox !== null}
          folders={folders}
          initialName={
            saveBox === null ? '' : suggestedTitle(saveBox.body) || saveBox.title
          }
          initialFolderId={saveBox?.folderId ?? null}
          onClose={() => setSaveBox(null)}
          onSave={(chosenName, folderId) => {
            const note = saveBox;
            setSaveBox(null);
            if (note === null) return;
            void useNotesDataStore
              .getState()
              .saveDraft(note.id, chosenName, folderId)
              .then(showFlash);
          }}
          onAddFolder={(draft) =>
            useNotesDataStore
              .getState()
              .addFolder(draft.name, draft.colour, draft.parentId)
          }
        />

        <ConfirmDialog
          open={ask !== null}
          title={ask?.title ?? ''}
          body={ask?.body}
          choices={ask?.choices ?? []}
          onDismiss={() => setAsk(null)}
        />
      </div>
    );
  },
);
