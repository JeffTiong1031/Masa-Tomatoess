import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PAD = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesPad.tsx'),
  'utf8',
);
const STRIP = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesStrip.tsx'),
  'utf8',
);
const EDITOR = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesEditor.tsx'),
  'utf8',
);
const SHELL = readFileSync(
  path.resolve(process.cwd(), 'src/components/AppShell.tsx'),
  'utf8',
);
const HOST = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesHost.tsx'),
  'utf8',
);
const WINDOW = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesWindow.tsx'),
  'utf8',
);
const SHEET = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesSheet.tsx'),
  'utf8',
);
const DATA = readFileSync(
  path.resolve(process.cwd(), 'src/store/useNotesDataStore.ts'),
  'utf8',
);

describe('notes pad select', () => {
  it('lets you pick tabs and delete the picked ones', () => {
    expect(STRIP).toContain("aria-label={selecting ? 'Done' : 'Select notes'}");
    expect(STRIP).toContain('Delete selected notes');
    expect(PAD).toContain('binNoteIds(');
    expect(PAD).toContain('h-3.5 w-3.5');
    expect(DATA).toContain('forgetNote(');
    expect(PAD).not.toContain('deleteNoteLocally(');
  });

  /* Deleting used to be the only thing × could mean, because a tab was
     the only place a note lived. Now × closes and Select → Delete
     deletes, and confusing the two would bin a file for wanting it off
     the strip. */
  it('closes on ×, and only asks when there is nothing to close back to', () => {
    expect(PAD).toContain('aria-label={`Close ${note.title}`}');
    expect(PAD).toContain('closeNotes([note.id])');
    expect(PAD).toContain('Save this note first?');
    expect(PAD).toContain("Don't save");
  });

  it('asks in a panel of its own, never through the browser', () => {
    expect(PAD).toContain('<ConfirmDialog');
    expect(PAD).not.toContain('confirm(');
  });
});

describe('notes pad saving', () => {
  it('puts Open and Save in the window title bar', () => {
    expect(WINDOW).toContain('aria-label="Open a file"');
    expect(WINDOW).toContain('aria-label="Save"');
    expect(WINDOW).toContain('padRef.current?.save()');
    expect(WINDOW).toContain('href="/notes"');
  });

  /* The phone sheet has no title bar of its own -- Modal owns that -- so
     the same two doors live in its footer. Without this they exist on the
     desktop only, and the pad on a phone has no way to the files page. */
  it('puts the same two doors in the phone sheet footer', () => {
    expect(SHEET).toContain('Open a file');
    expect(SHEET).toContain('padRef.current?.save()');
  });

  it('answers Ctrl+S, and marks a note that has never been saved', () => {
    expect(PAD).toContain('isSaveShortcut(');
    expect(PAD).toContain('event.preventDefault()');
    expect(PAD).toContain('aria-label="Not saved"');
    expect(PAD).toContain('<SaveNoteModal');
  });

  /* Which kind of note this is, and where it went, without pressing
     anything. A scribble that looks like a file is how typing gets lost. */
  it('says where the note stands at the end of the formatting row', () => {
    expect(PAD).toContain('Not saved yet');
    expect(PAD).toContain('`Saved in ${activeFolder.name}`');
    expect(STRIP).toContain('{status}');
    expect(STRIP).toContain('ml-auto');
  });

  it('shows the way out when no tab is open instead of planting a note', () => {
    expect(PAD).toContain('Nothing open.');
    expect(PAD).toContain('New note');
    expect(PAD).not.toContain('seedPad(');
  });
});

describe('notes line gap', () => {
  it('puts a spacing list beside the checklist, then Select', () => {
    expect(STRIP).toContain('Line and paragraph spacing');
    expect(STRIP).toContain('NOTE_LINE_GAPS.map');
    expect(STRIP.indexOf('Line and paragraph spacing')).toBeLessThan(
      STRIP.indexOf('Select notes'),
    );
  });

  it('puts bold and underline next to the checklist', () => {
    expect(STRIP).toContain('aria-label="Bold"');
    expect(STRIP).toContain('aria-label="Underline"');
    expect(STRIP.indexOf('aria-label="Checklist"')).toBeLessThan(
      STRIP.indexOf('aria-label="Bold"'),
    );
    expect(STRIP.indexOf('aria-label="Bold"')).toBeLessThan(
      STRIP.indexOf('aria-label="Underline"'),
    );
    expect(PAD).toContain('editorRef.current?.bold()');
    expect(PAD).toContain('editorRef.current?.underline()');
    expect(EDITOR).toContain('noteRunNodes(');
    expect(EDITOR).toContain('isStyleHotkey(');
    expect(EDITOR).toContain('<strong');
    expect(EDITOR).toContain('<u');
  });

  it('applies the chosen gap to every row in that note', () => {
    expect(EDITOR).toContain('noteLineGapStyle(lineGap)');
    expect(EDITOR).toContain('paddingBlock: gap.paddingBlock');
  });

  it('keeps the tick centred on the first line after the gap is applied', () => {
    expect(EDITOR).toContain('noteTickLineBox(lineGap)');
    expect(EDITOR).toContain('size-[1em]');
  });
});

describe('notes window host', () => {
  it('keeps Notes outside the page clip so the pad can hang off the edge', () => {
    const clip = SHELL.slice(SHELL.indexOf('overflow-x-hidden'));
    expect(clip).toMatch(/<\/div>\s*<NotesHost/);
  });

  /* Both the pad and the files page read the same store, so a rename on
     one shows on the other. Two copies of the notes in two components was
     the alternative, and the second one would always be the stale one. */
  it('keeps the pad and the files page on one set of notes', () => {
    expect(HOST).toContain('useNotesDataStore');
    expect(
      readFileSync(
        path.resolve(process.cwd(), 'src/components/notes/FilesBoard.tsx'),
        'utf8',
      ),
    ).toContain('useNotesDataStore');
  });

  it('does not let a cloud copy walk a deleted tab back in on refresh', () => {
    expect(DATA).toContain('loadPendingDeletes');
    expect(DATA).toContain('mergeNotesAfterReconcile');
    expect(DATA).not.toContain('mergeNotes(current, reconciled, [])');
  });
});
