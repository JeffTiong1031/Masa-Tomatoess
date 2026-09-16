import { describe, it, expect } from 'vitest';
import {
  NOTE_MARK_START,
  NOTE_MARK_SEP,
  NOTE_RUN_BOLD,
  NOTE_RUN_SEP,
  NOTE_RUN_START,
  NOTE_RUN_UNDERLINE,
  decodeBody,
  decodeLine,
  emptyPicture,
  encodeBody,
  encodeLine,
  stripMarks,
} from './noteDoc';

const SRC = 'data:image/webp;base64,AAA';

describe('stripMarks', () => {
  it('removes only the private start and sep characters', () => {
    expect(stripMarks(`hi${NOTE_MARK_START}there${NOTE_MARK_SEP}`)).toBe('hithere');
  });
});

describe('decodeLine', () => {
  it('treats a plain line as a paragraph', () => {
    expect(decodeLine('buy milk [x]')).toEqual({
      kind: 'paragraph',
      text: 'buy milk [x]',
    });
  });

  it('decodes a ticked nested item', () => {
    expect(decodeLine(`${NOTE_MARK_START}1/2${NOTE_MARK_SEP}Eggs`)).toEqual({
      kind: 'item',
      text: 'Eggs',
      checked: true,
      indent: 2,
    });
  });

  it('opens a broken mark as a paragraph and keeps the words', () => {
    expect(decodeLine(`${NOTE_MARK_START}nope Eggs`)).toEqual({
      kind: 'paragraph',
      text: 'nope Eggs',
    });
  });
});

describe('decodeBody / encodeBody', () => {
  it('opens an empty note as one empty paragraph and writes back empty', () => {
    expect(decodeBody('')).toEqual([{ kind: 'paragraph', text: '' }]);
    expect(encodeBody([{ kind: 'paragraph', text: '' }])).toBe('');
  });

  it('round-trips ordinary notes unchanged', () => {
    expect(encodeBody(decodeBody('hello'))).toBe('hello');
    expect(encodeBody(decodeBody('a\nb'))).toBe('a\nb');
  });

  it('round-trips ticks and indent', () => {
    const blocks = [
      { kind: 'paragraph' as const, text: 'Above' },
      { kind: 'item' as const, text: 'Parent', checked: false, indent: 0 },
      { kind: 'item' as const, text: 'Child', checked: true, indent: 1 },
      { kind: 'paragraph' as const, text: 'Below' },
    ];
    expect(decodeBody(encodeBody(blocks))).toEqual(blocks);
  });

  it('round-trips bold and underline without changing a plain note', () => {
    const blocks = [
      {
        kind: 'paragraph' as const,
        text: 'hello world',
        spans: [{ start: 6, end: 11, bold: true, underline: true }],
      },
    ];
    const encoded = encodeBody(blocks);
    expect(encoded).toContain(NOTE_RUN_START);
    expect(encoded).toContain(NOTE_RUN_BOLD);
    expect(encoded).toContain(NOTE_RUN_UNDERLINE);
    expect(encoded).toContain(NOTE_RUN_SEP);
    expect(decodeBody(encoded)).toEqual(blocks);
    expect(encodeBody(decodeBody('plain'))).toBe('plain');
  });

  it('opens a broken style mark as plain words', () => {
    expect(decodeLine(`${NOTE_RUN_START}nope`)).toEqual({
      kind: 'paragraph',
      text: 'nope',
    });
  });
});

describe('picture lines', () => {
  it('round-trips sit, size, place, and the picture bytes', () => {
    const block = {
      kind: 'picture' as const,
      sit: 'front' as const,
      width: 0.4,
      x: 0.2,
      y: 0.7,
      src: SRC,
    };
    expect(decodeBody(encodeBody([block]))).toEqual([block]);
  });

  it('keeps an old note with no pictures the same', () => {
    expect(encodeBody(decodeBody('hello\nthere'))).toBe('hello\nthere');
  });

  it('opens a broken picture line as the empty frame', () => {
    expect(decodeLine(`${NOTE_MARK_START}pic/nope${NOTE_MARK_SEP}x`)).toEqual(
      emptyPicture(),
    );
  });

  it('opens a missing src as the empty frame with the sit kept', () => {
    const raw = `${NOTE_MARK_START}pic/inline/1/0.5/0.15${NOTE_MARK_SEP}`;
    expect(decodeLine(raw)).toEqual({
      kind: 'picture',
      sit: 'inline',
      width: 1,
      x: 0.5,
      y: 0.15,
      src: '',
    });
  });
});
