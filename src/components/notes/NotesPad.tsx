'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserName } from '@/lib/identity';
import { NOTE_SAVE_PAUSE_MS, titleOrDefault, type Note } from '@/lib/note';
import { saveNote } from '@/lib/noteLocal';
import { addNote, removeNote, removeNotes, renameNote } from '@/lib/notePad';
import { forgetNote } from '@/lib/noteSync';
import {
  DEFAULT_NOTE_LINE_GAP,
} from '@/lib/noteLineGap';
import { useNotesUiStore } from '@/store/useNotesUiStore';
import {
  NotesEditor,
  type NotesCaretInfo,
  type NotesEditorHandle,
} from './NotesEditor';
import { NotesStrip } from './NotesStrip';

interface NotesPadProps {
  owner: UserName;
  notes: Note[];
  activeId: string;
  onNotes: (notes: Note[]) => void;
  onActiveId: (id: string) => void;
}

export function NotesPad({
  owner,
  notes,
  activeId,
  onNotes,
  onActiveId,
}: NotesPadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const lineGapById = useNotesUiStore((state) => state.lineGapById);
  const setLineGap = useNotesUiStore((state) => state.setLineGap);
  const clearLineGaps = useNotesUiStore((state) => state.clearLineGaps);
  const [strip, setStrip] = useState<NotesCaretInfo>({
    inWords: false,
    inChecklist: false,
    canIndent: false,
    canOutdent: false,
  });
  const editorRef = useRef<NotesEditorHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Note | null>(null);
  const active = notes.find((note) => note.id === activeId) ?? notes[0];
  const lineGap = (lineGapById ?? {})[active.id] ?? DEFAULT_NOTE_LINE_GAP;
  const pickedIds = notes.filter((note) => picked[note.id]).map((note) => note.id);

  const flushPendingSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const pending = pendingSave.current;
    saveTimer.current = null;
    pendingSave.current = null;
    if (pending) void saveNote(pending);
  }, []);

  useEffect(() => () => flushPendingSave(), [flushPendingSave]);

  const startRename = (note: Note) => {
    flushPendingSave();
    setEditingId(note.id);
    setName(note.title);
  };

  const commitRename = (note: Note) => {
    flushPendingSave();
    const renamed = renameNote(
      notes,
      note.id,
      titleOrDefault(name),
      new Date().toISOString(),
    );
    onNotes(renamed);
    setEditingId(null);
    void saveNote(renamed.find((item) => item.id === note.id)!);
  };

  const createNote = () => {
    flushPendingSave();
    const id = crypto.randomUUID();
    const next = addNote(notes, owner, new Date().toISOString(), id);
    const created = next[next.length - 1];
    onNotes(next);
    onActiveId(id);
    void saveNote(created);
  };

  const deleteNote = (note: Note) => {
    if (!confirm('Delete this note?')) return;
    flushPendingSave();
    const next = removeNote(
      notes,
      note.id,
      owner,
      new Date().toISOString(),
      crypto.randomUUID(),
    );
    onNotes(next);
    onActiveId(next[0].id);
    void forgetNote(note.id, owner);
    clearLineGaps([note.id]);
    if (notes.length === 1) void saveNote(next[0]);
  };

  const deletePicked = () => {
    if (pickedIds.length === 0) return;
    const ask =
      pickedIds.length === 1
        ? 'Delete this note?'
        : 'Delete these notes?';
    if (!confirm(ask)) return;
    flushPendingSave();
    const next = removeNotes(
      notes,
      pickedIds,
      owner,
      new Date().toISOString(),
      crypto.randomUUID(),
    );
    onNotes(next);
    onActiveId(
      next.some((item) => item.id === activeId) ? activeId : next[0].id,
    );
    for (const id of pickedIds) {
      void forgetNote(id, owner);
    }
    clearLineGaps(pickedIds);
    if (pickedIds.length === notes.length) void saveNote(next[0]);
    setPicked({});
    setSelecting(false);
  };

  const selectNote = (id: string) => {
    flushPendingSave();
    onActiveId(id);
  };

  const updateBody = (body: string) => {
    const updatedAt = new Date().toISOString();
    const updated = { ...active, body, updatedAt };
    onNotes(
      notes.map((note) => (note.id === active.id ? updated : note)),
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingSave.current = updated;
    saveTimer.current = setTimeout(() => {
      flushPendingSave();
    }, NOTE_SAVE_PAUSE_MS);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-11 shrink-0 overflow-x-auto border-b border-[var(--mt-border)]">
        {notes.map((note) => {
          const isActive = note.id === active.id;
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
                  className="min-h-11 min-w-11 px-3 text-[var(--mt-text)]"
                  onClick={() => {
                    if (selecting) {
                      setPicked((current) => ({
                        ...current,
                        [note.id]: !current[note.id],
                      }));
                      return;
                    }
                    if (isActive) startRename(note);
                    else selectNote(note.id);
                  }}
                  onDoubleClick={() => {
                    if (!selecting) startRename(note);
                  }}
                >
                  {note.title}
                </button>
              )}
              {isActive && !selecting && (
                <button
                  type="button"
                  aria-label={`Delete ${note.title}`}
                  className="min-h-11 min-w-11 text-[var(--mt-text)]"
                  onClick={() => deleteNote(note)}
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
      <NotesStrip
        inWords={strip.inWords}
        inChecklist={strip.inChecklist}
        canIndent={strip.canIndent}
        canOutdent={strip.canOutdent}
        lineGap={lineGap}
        selecting={selecting}
        canDeletePicked={pickedIds.length > 0}
        onToggle={() => editorRef.current?.toggle()}
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
    </div>
  );
}
