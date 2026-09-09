import { describe, it, expect } from 'vitest';
import {
  isChecklistHotkey,
  isTypingElement,
  isTypingTag,
  notesShortcut,
} from './noteShortcut';

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
