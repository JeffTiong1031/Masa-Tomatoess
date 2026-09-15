import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CARD = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NoteCard.tsx'),
  'utf8',
);
const RAIL = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/FolderRail.tsx'),
  'utf8',
);
const BOARD = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/FilesBoard.tsx'),
  'utf8',
);

function folderRowMark(source: string): string {
  const start = source.indexOf('style={{ background: folder.colour }}');
  expect(start).toBeGreaterThan(-1);
  return source.slice(Math.max(0, start - 220), start + 80);
}

describe('notes paper cards', () => {
  it('paints one moss hairline on every card, not a folder colour', () => {
    expect(CARD).toContain('absolute top-0 left-0 right-0 h-1.5');
    expect(CARD).toContain("background: 'var(--mt-accent)'");
    expect(CARD).not.toContain('background: folder?.colour');
  });

  it('washes the preview in 10% accent so every card is the same colour', () => {
    expect(CARD).toContain(
      'bg-[color-mix(in_srgb,var(--mt-accent)_10%,transparent)]',
    );
  });

  it('keeps the date pip on the notes accent, not a per-card hue', () => {
    const when = CARD.slice(CARD.indexOf('whenTouched'));
    expect(when).toContain("background: 'var(--mt-accent)'");
    expect(when).not.toContain('folder?.colour');
  });
});

describe('notes files toolbar', () => {
  it('sits search, sort, Folder and New note in one paper bar', () => {
    const bar = BOARD.slice(
      BOARD.indexOf('Search notes by name'),
      BOARD.indexOf('New note') + 40,
    );
    expect(BOARD).toContain('mt-soft p-2 flex flex-wrap items-center');
    expect(bar).toContain('Search notes');
    expect(bar).toContain('NOTE_SORTS.map');
    expect(bar).toContain('Folder');
    expect(bar).toContain('New note');
  });
});

describe('notes folder marks', () => {
  it('uses a plain 10px filled circle with no square well', () => {
    const mark = folderRowMark(RAIL);
    expect(mark).toContain('size-2.5 shrink-0 rounded-full');
    expect(mark).not.toContain('size-8');
    expect(mark).not.toContain('rounded-lg');
  });

  it('fills the selected row with the notes accent', () => {
    expect(RAIL).toContain('bg-[var(--mt-accent)]');
    expect(RAIL).not.toContain('var(--mt-accent)_30%');
  });
});
