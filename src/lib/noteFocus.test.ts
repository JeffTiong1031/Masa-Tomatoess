import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const PAD = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesPad.tsx'),
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
    expect(PAD).toContain('mt-quiet-focus');
  });
});
