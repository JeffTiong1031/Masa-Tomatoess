import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

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
      /className=\{`([^`]+)`\}[\s\S]{0,250}contentEditable=\{!disabled\}/,
    );
    expect(match?.[1]).toContain('mt-quiet-focus');
  });

  it('keeps the tick button inside the checklist row', () => {
    expect(EDITOR).toMatch(
      /block\.kind === 'item'[\s\S]{0,400}shrink-0[\s\S]{0,80}items-center justify-center/,
    );
  });

  it('uses the lucide tick that sits inside the square', () => {
    expect(EDITOR).toContain('<CheckSquare2');
    expect(EDITOR).not.toContain('<CheckSquare ');
  });
});
