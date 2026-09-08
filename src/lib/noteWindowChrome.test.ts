import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const WINDOW = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesWindow.tsx'),
  'utf8',
);

describe('notes window chrome', () => {
  it('shades the minimise button on hover', () => {
    expect(WINDOW).toContain(
      'hover:bg-[color-mix(in_srgb,var(--mt-text)_10%,transparent)]',
    );
  });

  it('fills the close button with danger on hover', () => {
    expect(WINDOW).toContain('hover:bg-[var(--mt-danger)]');
    expect(WINDOW).toContain('hover:text-[var(--mt-danger-contrast)]');
  });
});
