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

describe('notes pad select', () => {
  it('lets you pick tabs and delete the picked ones', () => {
    expect(STRIP).toContain("aria-label={selecting ? 'Done' : 'Select notes'}");
    expect(STRIP).toContain('Delete selected notes');
    expect(PAD).toContain('removeNotes(');
    expect(PAD).toContain('h-3.5 w-3.5');
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

  it('applies the chosen gap to every row in that note', () => {
    expect(EDITOR).toContain('noteLineGapStyle(lineGap)');
    expect(EDITOR).toContain('paddingBlock: gap.paddingBlock');
  });
});

describe('notes window host', () => {
  it('keeps Notes outside the page clip so the pad can hang off the edge', () => {
    const clip = SHELL.slice(SHELL.indexOf('overflow-x-hidden'));
    expect(clip).toMatch(/<\/div>\s*<NotesHost/);
  });
});
