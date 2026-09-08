'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserName } from '@/lib/identity';
import { NOTE_SAVE_PAUSE_MS, titleOrDefault, type Note } from '@/lib/note';
import { deleteNoteLocally, saveNote } from '@/lib/noteLocal';
import { addNote, removeNote, renameNote } from '@/lib/notePad';

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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Note | null>(null);
  const active = notes.find((note) => note.id === activeId) ?? notes[0];

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
    void deleteNoteLocally(note.id, owner);
    if (notes.length === 1) void saveNote(next[0]);
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
                  onClick={() =>
                    isActive ? startRename(note) : selectNote(note.id)
                  }
                  onDoubleClick={() => startRename(note)}
                >
                  {note.title}
                </button>
              )}
              {isActive && (
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
      <textarea
        aria-label="Note"
        className="mt-quiet-focus min-h-11 flex-1 resize-none border-0 bg-[var(--mt-surface)] p-3 text-[var(--mt-text)]"
        value={active.body}
        onChange={(event) => updateBody(event.target.value)}
      />
    </div>
  );
}
