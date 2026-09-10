import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  beforeInputAction,
  clipboardAction,
  shouldCommitFromInput,
  shouldReplaceEditorBody,
  shouldRestoreCaretAfterTextCommit,
} from './noteEditorPolicy';

const EDITOR = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesEditor.tsx'),
  'utf8',
);

describe('clipboardAction', () => {
  it('lets the browser keep the clipboard when the range is collapsed', () => {
    expect(clipboardAction(true, 'copy')).toBe('let-native');
    expect(clipboardAction(true, 'cut')).toBe('let-native');
  });

  it('writes a real range and deletes it on cut', () => {
    expect(clipboardAction(false, 'copy')).toBe('write');
    expect(clipboardAction(false, 'cut')).toBe('write-and-delete');
  });
});

describe('shouldCommitFromInput', () => {
  it('does not commit while composing', () => {
    expect(shouldCommitFromInput(true)).toBe(false);
    expect(shouldCommitFromInput(false)).toBe(true);
  });
});

describe('shouldRestoreCaretAfterTextCommit', () => {
  it('puts the caret back after ordinary typing', () => {
    expect(shouldRestoreCaretAfterTextCommit(false)).toBe(true);
  });

  it('leaves the native caret alone while composing', () => {
    expect(shouldRestoreCaretAfterTextCommit(true)).toBe(false);
  });
});

describe('beforeInputAction', () => {
  it('treats phone line-break input as Enter even when the caret is collapsed', () => {
    expect(beforeInputAction('insertLineBreak', true, false)).toBe('enter');
    expect(beforeInputAction('insertParagraph', true, false)).toBe('enter');
    expect(beforeInputAction('insertLineBreak', false, false)).toBe('enter');
  });

  it('leaves collapsed ordinary typing to the browser', () => {
    expect(beforeInputAction('insertText', true, true)).toBe('ignore');
  });

  it('types over and deletes a painted range', () => {
    expect(beforeInputAction('insertText', false, true)).toBe('type-over');
    expect(beforeInputAction('deleteContentBackward', false, false)).toBe(
      'delete',
    );
  });
});

describe('shouldReplaceEditorBody', () => {
  it('ignores the editor’s own encoded echo', () => {
    expect(shouldReplaceEditorBody('hello', 'hello')).toBe(false);
  });

  it('replaces when a newer body does not match the current blocks', () => {
    expect(shouldReplaceEditorBody('from cloud', 'local')).toBe(true);
  });
});

describe('NotesEditor wiring', () => {
  it('asks clipboardAction before copy or cut', () => {
    expect(EDITOR).toContain("clipboardAction(");
    expect(EDITOR).toContain("'let-native'");
  });

  it('skips onInput commits while composing and commits on compositionend', () => {
    expect(EDITOR).toContain('shouldCommitFromInput(');
    expect(EDITOR).toContain('onCompositionEnd');
    expect(EDITOR).toContain('textContent');
  });

  it('asks shouldRestoreCaretAfterTextCommit instead of skipping restore', () => {
    expect(EDITOR).toContain('shouldRestoreCaretAfterTextCommit(');
    expect(EDITOR).not.toMatch(/commit\(inserted\.blocks,\s*caret,\s*false\)/);
  });

  it('routes insertLineBreak and insertParagraph through enterAt', () => {
    expect(EDITOR).toContain('beforeInputAction(');
    expect(EDITOR).toContain("case 'enter':");
    expect(EDITOR).toContain('enterAt(');
  });

  it('reloads blocks when an outside body does not match encodeBody', () => {
    expect(EDITOR).toContain('shouldReplaceEditorBody(');
    expect(EDITOR).toContain('decodeBody(body)');
  });
});
