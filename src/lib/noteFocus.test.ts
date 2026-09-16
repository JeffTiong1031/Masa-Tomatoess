import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { NOTE_SELECTION_FILL } from './noteSelectionPaint';

const CSS = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const EDITOR = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesEditor.tsx'),
  'utf8',
);

function ruleBody(selector: string): string {
  const index = CSS.indexOf(selector);
  if (index === -1) return '';
  const braceStart = CSS.indexOf('{', index);
  const braceEnd = CSS.indexOf('}', braceStart);
  return CSS.slice(braceStart + 1, braceEnd);
}

describe('the note typing area', () => {
  it('turns off the cocoa focus ring with an unlayered quiet-focus rule', () => {
    const body = ruleBody('.mt-quiet-focus:focus-visible');
    expect(body).not.toBe('');
    expect(body).toMatch(/outline:\s*none/);
  });

  it('uses quiet-focus on the note body', () => {
    expect(EDITOR).toContain('mt-quiet-focus');
  });

  it('quiets the cocoa ring on the line you type in', () => {
    const match = EDITOR.match(
      /className=\{`(mt-quiet-focus[^`]*)`[\s\S]*?contentEditable=\{block\.kind !== 'picture' && !disabled\}/,
    );
    expect(match?.[1]).toContain('mt-quiet-focus');
  });

  it('keeps the tick button inside the checklist row', () => {
    expect(EDITOR).toMatch(
      /block\.kind === 'item'[\s\S]{0,400}shrink-0[\s\S]{0,80}items-center justify-center/,
    );
  });

  it('sizes the tick to one line instead of a 44px box that sits off centre', () => {
    expect(EDITOR).toContain('noteTickLineBox(lineGap)');
    expect(EDITOR).not.toMatch(/role="checkbox"[\s\S]{0,220}min-h-11/);
  });

  it('uses the lucide tick that sits inside the square', () => {
    expect(EDITOR).toContain('<CheckSquare2');
    expect(EDITOR).not.toContain('<CheckSquare ');
  });

  it('does not wash a selected line with the section accent', () => {
    expect(EDITOR).not.toContain(
      'bg-[color-mix(in_srgb,var(--mt-accent)_28%,transparent)]',
    );
    expect(EDITOR).toContain('placeNativeRange');
  });

  it('paints a multi-row highlight on the words, not the whole row', () => {
    expect(EDITOR).toContain('noteSelectionSlice');
    expect(EDITOR).toContain('getClientRects');
    expect(EDITOR).toContain('marks.map');
    expect(EDITOR).not.toContain('noteSelectionCoversLine');
  });

  it('uses one light highlight, not the browser dark blue on top', () => {
    expect(EDITOR).toContain('mt-note-sel');
    expect(ruleBody('.mt-note-sel ::selection')).toContain(NOTE_SELECTION_FILL);
    expect(EDITOR).toMatch(/setMarks\(next\);[\s\S]{0,80}placeNativeCaret/);
  });
});
