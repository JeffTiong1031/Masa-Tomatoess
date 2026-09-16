import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sectionHrefForShortcut } from './sectionShortcut';

const SHELL = readFileSync(
  path.resolve(process.cwd(), 'src/components/AppShell.tsx'),
  'utf8',
);
const SHORTCUT = readFileSync(
  path.resolve(process.cwd(), 'src/components/nav/SectionShortcut.tsx'),
  'utf8',
);

describe('sectionHrefForShortcut', () => {
  it('opens each section on its letter', () => {
    expect(sectionHrefForShortcut('s', false, false, false, '/')).toBe(
      '/study',
    );
    expect(sectionHrefForShortcut('t', false, false, false, '/')).toBe(
      '/timetable',
    );
    expect(sectionHrefForShortcut('d', false, false, false, '/')).toBe(
      '/todo',
    );
    expect(sectionHrefForShortcut('c', false, false, false, '/')).toBe(
      '/calendar',
    );
    expect(sectionHrefForShortcut('p', false, false, false, '/')).toBe(
      '/cycle',
    );
    expect(sectionHrefForShortcut('o', false, false, false, '/')).toBe(
      '/countdown',
    );
    expect(sectionHrefForShortcut('m', false, false, false, '/')).toBe(
      '/meals',
    );
    expect(sectionHrefForShortcut('f', false, false, false, '/')).toBe(
      '/fitness',
    );
    expect(sectionHrefForShortcut('i', false, false, false, '/')).toBe(
      '/finance',
    );
  });

  it('accepts either case', () => {
    expect(sectionHrefForShortcut('S', false, false, false, '/')).toBe(
      '/study',
    );
    expect(sectionHrefForShortcut('O', false, false, false, '/')).toBe(
      '/countdown',
    );
  });

  it('leaves n for the notepad', () => {
    expect(sectionHrefForShortcut('n', false, false, false, '/')).toBe(null);
    expect(sectionHrefForShortcut('N', false, false, false, '/')).toBe(null);
  });

  it('does not send Home or Escape', () => {
    expect(sectionHrefForShortcut('h', false, false, false, '/todo')).toBe(
      null,
    );
    expect(sectionHrefForShortcut('Escape', false, false, false, '/todo')).toBe(
      null,
    );
  });

  it('ignores the key while typing, with a modifier, or over a pad or dialog', () => {
    expect(sectionHrefForShortcut('s', true, false, false, '/')).toBe(null);
    expect(sectionHrefForShortcut('s', false, true, false, '/')).toBe(null);
    expect(sectionHrefForShortcut('s', false, false, true, '/')).toBe(null);
  });

  it('does nothing when that section is already open', () => {
    expect(
      sectionHrefForShortcut('s', false, false, false, '/study/timer'),
    ).toBe(null);
    expect(sectionHrefForShortcut('d', false, false, false, '/todo')).toBe(
      null,
    );
  });
});

describe('section shortcut wiring', () => {
  it('listens from the app shell so every page can jump', () => {
    expect(SHELL).toContain('SectionShortcut');
  });

  it('lets typing, Notes, and any dialog keep the key first', () => {
    expect(SHORTCUT).toContain('isTypingElement');
    expect(SHORTCUT).toContain('useNotesUiStore.getState().open');
    expect(SHORTCUT).toContain('[role="dialog"]');
  });

  it('jumps with the router so the page changes', () => {
    expect(SHORTCUT).toContain('router.push');
    expect(SHORTCUT).toContain('sectionHrefForShortcut');
  });
});
