import { describe, it, expect } from 'vitest';
import {
  isChecklistHotkey,
  isEditorCommandBlocked,
  isSaveShortcut,
  isStyleHotkey,
  isTypingElement,
  isTypingTag,
  notesShortcut,
} from './noteShortcut';

describe('isSaveShortcut', () => {
  it('is Ctrl+S or Cmd+S, either case', () => {
    expect(isSaveShortcut('s', true)).toBe(true);
    expect(isSaveShortcut('S', true)).toBe(true);
  });

  it('is not plain s, which is just typing', () => {
    expect(isSaveShortcut('s', false)).toBe(false);
  });

  it('is not some other key with the same modifier', () => {
    expect(isSaveShortcut('n', true)).toBe(false);
  });
});

describe('isTypingTag', () => {
  it('treats form fields as typing', () => {
    expect(isTypingTag('INPUT')).toBe(true);
    expect(isTypingTag('TEXTAREA')).toBe(true);
    expect(isTypingTag('SELECT')).toBe(true);
    expect(isTypingTag('BUTTON')).toBe(false);
  });
});

describe('notesShortcut', () => {
  it('opens on n when not typing and no modifier', () => {
    expect(notesShortcut('n', false, false)).toBe('open');
    expect(notesShortcut('N', false, false)).toBe('open');
  });

  it('ignores n while typing or with a modifier', () => {
    expect(notesShortcut('n', true, false)).toBe(null);
    expect(notesShortcut('n', false, true)).toBe(null);
  });

  it('closes on Escape even while typing', () => {
    expect(notesShortcut('Escape', true, false)).toBe('close');
  });
});

describe('isTypingElement', () => {
  it('treats a contenteditable div as typing', () => {
    expect(isTypingElement('DIV', true)).toBe(true);
    expect(isTypingElement('DIV', false)).toBe(false);
  });
});

describe('isChecklistHotkey', () => {
  it('matches Ctrl+Shift+9 and Cmd+Shift+9, not Alt', () => {
    expect(isChecklistHotkey('9', true, true, false)).toBe(true);
    expect(isChecklistHotkey('9', true, true, true)).toBe(false);
    expect(isChecklistHotkey('9', false, true, false)).toBe(false);
  });
});

describe('isStyleHotkey', () => {
  it('matches Ctrl+B and Ctrl+U, not Shift or Alt', () => {
    expect(isStyleHotkey('b', false, true, false)).toBe('bold');
    expect(isStyleHotkey('u', false, true, false)).toBe('underline');
    expect(isStyleHotkey('b', true, true, false)).toBe(null);
    expect(isStyleHotkey('u', false, true, true)).toBe(null);
  });
});

describe('isEditorCommandBlocked', () => {
  it('blocks commands throughout an active composition', () => {
    expect(isEditorCommandBlocked(true, false, 'Enter')).toBe(true);
    expect(isEditorCommandBlocked(false, true, 'Enter')).toBe(true);
  });

  it('blocks Process keys outside the reported composition window', () => {
    expect(isEditorCommandBlocked(false, false, 'Process')).toBe(true);
    expect(isEditorCommandBlocked(false, false, 'Enter')).toBe(false);
  });
});
