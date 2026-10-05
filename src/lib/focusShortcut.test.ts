import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { focusHrefForShortcut } from './focusShortcut';

const LAYOUT = readFileSync(
  path.resolve(process.cwd(), 'src/app/study/layout.tsx'),
  'utf8',
);
const KEYS = readFileSync(
  path.resolve(process.cwd(), 'src/components/nav/FocusShortcut.tsx'),
  'utf8',
);

const press = (key: string, pathname: string, shift = false) =>
  focusHrefForShortcut(key, shift, false, false, false, pathname);

describe('focusHrefForShortcut', () => {
  it('moves right with the right arrow', () => {
    expect(press('ArrowRight', '/study/timer')).toBe('/study/flexible');
    expect(press('ArrowRight', '/study/flexible')).toBe('/study/dashboard');
  });

  it('moves left with the left arrow', () => {
    expect(press('ArrowLeft', '/study/dashboard')).toBe('/study/flexible');
    expect(press('ArrowLeft', '/study/flexible')).toBe('/study/timer');
  });

  it('wraps round at both ends', () => {
    expect(press('ArrowRight', '/study/dashboard')).toBe('/study/timer');
    expect(press('ArrowLeft', '/study/timer')).toBe('/study/dashboard');
  });

  it('treats Tab as right and Shift+Tab as left, wrapping too', () => {
    expect(press('Tab', '/study/timer')).toBe('/study/flexible');
    expect(press('Tab', '/study/flexible')).toBe('/study/dashboard');
    expect(press('Tab', '/study/dashboard')).toBe('/study/timer');
    expect(press('Tab', '/study/timer', true)).toBe('/study/dashboard');
  });

  it('leaves Shift with the arrows alone', () => {
    expect(press('ArrowRight', '/study/timer', true)).toBe(null);
  });

  it('ignores other keys', () => {
    expect(press('ArrowUp', '/study/timer')).toBe(null);
    expect(press('a', '/study/timer')).toBe(null);
  });

  it('only works on the three Focus pages', () => {
    expect(press('ArrowRight', '/study')).toBe(null);
    expect(press('ArrowRight', '/todo')).toBe(null);
    expect(press('Tab', '/')).toBe(null);
  });

  it('ignores the key while typing, with a modifier, or over a pad or dialog', () => {
    expect(
      focusHrefForShortcut('Tab', false, true, false, false, '/study/timer'),
    ).toBe(null);
    expect(
      focusHrefForShortcut('Tab', false, false, true, false, '/study/timer'),
    ).toBe(null);
    expect(
      focusHrefForShortcut('Tab', false, false, false, true, '/study/timer'),
    ).toBe(null);
  });
});

describe('focus shortcut wiring', () => {
  it('listens from the Study layout', () => {
    expect(LAYOUT).toContain('FocusShortcut');
  });

  it('lets typing, Notes, and any dialog keep the key first', () => {
    expect(KEYS).toContain('isTypingElement');
    expect(KEYS).toContain('useNotesUiStore.getState().open');
    expect(KEYS).toContain('[role="dialog"]');
  });

  it('switches with the router', () => {
    expect(KEYS).toContain('router.push');
    expect(KEYS).toContain('focusHrefForShortcut');
  });
});
