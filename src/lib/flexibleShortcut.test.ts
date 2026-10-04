import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  flexibleKeyAction,
  flexibleKeyFor,
  type FlexibleKeyState,
} from './flexibleShortcut';

const read = (file: string) =>
  readFileSync(path.resolve(process.cwd(), file), 'utf8');

const idle: FlexibleKeyState = {
  phase: 'study',
  isActive: false,
  awaitingChoice: false,
  isAlarmRinging: false,
  elapsedSeconds: 0,
};
const studying: FlexibleKeyState = { ...idle, isActive: true, elapsedSeconds: 90 };
const stopped: FlexibleKeyState = { ...idle, awaitingChoice: true, elapsedSeconds: 90 };
const resting: FlexibleKeyState = { ...idle, phase: 'rest', isActive: true };
const ringing: FlexibleKeyState = { ...idle, isAlarmRinging: true };

describe('flexibleKeyFor', () => {
  it('reads space and enter over the page', () => {
    expect(flexibleKeyFor(' ', false, 'BODY', false, false, false)).toBe('space');
    expect(flexibleKeyFor('Enter', false, 'BODY', false, false, false)).toBe(
      'enter',
    );
  });

  it('ignores other keys', () => {
    expect(flexibleKeyFor('a', false, 'BODY', false, false, false)).toBeNull();
  });

  it('leaves both keys to typing, modifiers, dialogs and held keys', () => {
    for (const key of [' ', 'Enter']) {
      expect(flexibleKeyFor(key, true, 'INPUT', false, false, false)).toBeNull();
      expect(flexibleKeyFor(key, false, 'BODY', true, false, false)).toBeNull();
      expect(flexibleKeyFor(key, false, 'BODY', false, true, false)).toBeNull();
      expect(flexibleKeyFor(key, false, 'BODY', false, false, true)).toBeNull();
    }
  });

  it('lets a focused button or link keep its own press', () => {
    for (const key of [' ', 'Enter']) {
      expect(flexibleKeyFor(key, false, 'BUTTON', false, false, false)).toBeNull();
      expect(flexibleKeyFor(key, false, 'A', false, false, false)).toBeNull();
    }
  });
});

describe('flexibleKeyAction', () => {
  it('space starts, stops, and picks the study back up', () => {
    expect(flexibleKeyAction('space', idle)).toBe('start');
    expect(flexibleKeyAction('space', studying)).toBe('stop');
    expect(flexibleKeyAction('space', stopped)).toBe('continue');
  });

  it('space does nothing during rest or while the alarm rings', () => {
    expect(flexibleKeyAction('space', resting)).toBeNull();
    expect(flexibleKeyAction('space', ringing)).toBeNull();
  });

  it('enter after stopping proceeds to rest', () => {
    expect(flexibleKeyAction('enter', stopped)).toBe('rest');
  });

  it('enter after stopping with nothing studied does nothing', () => {
    expect(
      flexibleKeyAction('enter', { ...stopped, elapsedSeconds: 0 }),
    ).toBeNull();
  });

  it('enter during rest or the end-of-rest alarm starts a fresh study', () => {
    expect(flexibleKeyAction('enter', resting)).toBe('restart');
    expect(flexibleKeyAction('enter', ringing)).toBe('restart');
  });

  it('enter does nothing while idle or mid-study', () => {
    expect(flexibleKeyAction('enter', idle)).toBeNull();
    expect(flexibleKeyAction('enter', studying)).toBeNull();
  });
});

describe('keyboard shortcut wiring', () => {
  it('drives the flexible timer only', () => {
    expect(read('src/components/FlexibleControls.tsx')).toContain(
      'useFlexibleKeys',
    );
    expect(read('src/components/Controls.tsx')).not.toMatch(
      /useSpaceToggle|useFlexibleKeys/,
    );
  });
});
