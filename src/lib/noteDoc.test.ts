import { describe, it, expect } from 'vitest';
import {
  NOTE_MARK_START,
  NOTE_MARK_SEP,
  decodeBody,
  encodeBody,
  decodeLine,
  stripMarks,
} from './noteDoc';

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
});
