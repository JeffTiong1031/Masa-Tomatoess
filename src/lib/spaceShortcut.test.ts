import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isSpaceToggle } from './spaceShortcut';

const read = (file: string) =>
  readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('isSpaceToggle', () => {
  it('fires on a plain space over the page', () => {
    expect(isSpaceToggle(' ', false, 'BODY', false, false, false)).toBe(true);
  });

  it('ignores other keys', () => {
    expect(isSpaceToggle('Enter', false, 'BODY', false, false, false)).toBe(
      false,
    );
  });

  it('leaves space to typing, modifiers, dialogs and held keys', () => {
    expect(isSpaceToggle(' ', true, 'INPUT', false, false, false)).toBe(false);
    expect(isSpaceToggle(' ', false, 'BODY', true, false, false)).toBe(false);
    expect(isSpaceToggle(' ', false, 'BODY', false, true, false)).toBe(false);
    expect(isSpaceToggle(' ', false, 'BODY', false, false, true)).toBe(false);
  });

  it('lets a focused button keep its own space press', () => {
    expect(isSpaceToggle(' ', false, 'BUTTON', false, false, false)).toBe(
      false,
    );
  });
});

describe('space shortcut wiring', () => {
  it('drives both the classic and flexible timers', () => {
    expect(read('src/components/Controls.tsx')).toContain('useSpaceToggle');
    expect(read('src/components/FlexibleControls.tsx')).toContain(
      'useSpaceToggle',
    );
  });
});
