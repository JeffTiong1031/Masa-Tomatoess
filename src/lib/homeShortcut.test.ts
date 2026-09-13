import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { shouldGoHomeOnEscape } from './homeShortcut';

const SHELL = readFileSync(
  path.resolve(process.cwd(), 'src/components/AppShell.tsx'),
  'utf8',
);
const ESCAPE = readFileSync(
  path.resolve(process.cwd(), 'src/components/nav/HomeEscape.tsx'),
  'utf8',
);

describe('shouldGoHomeOnEscape', () => {
  it('sends Escape home from a section', () => {
    expect(shouldGoHomeOnEscape('Escape', '/todo', false, false)).toBe(true);
    expect(shouldGoHomeOnEscape('Escape', '/study/timer', false, false)).toBe(
      true,
    );
  });

  it('does nothing on Home', () => {
    expect(shouldGoHomeOnEscape('Escape', '/', false, false)).toBe(false);
  });

  it('does not steal Escape from Notes, the menu, or a dialog', () => {
    expect(shouldGoHomeOnEscape('Escape', '/calendar', true, false)).toBe(false);
  });

  it('ignores other keys and modifier chords', () => {
    expect(shouldGoHomeOnEscape('n', '/todo', false, false)).toBe(false);
    expect(shouldGoHomeOnEscape('Escape', '/todo', false, true)).toBe(false);
  });
});

describe('home escape wiring', () => {
  it('listens from the app shell so every page can go Home', () => {
    expect(SHELL).toContain('HomeEscape');
  });

  it('lets Notes and any dialog keep Escape first', () => {
    expect(ESCAPE).toContain('useNotesUiStore.getState().open');
    expect(ESCAPE).toContain('[role="dialog"]');
  });
});
