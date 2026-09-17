import { describe, expect, it } from 'vitest';
import {
  applyMark,
  concatVisible,
  deleteVisible,
  inheritStyle,
  insertVisible,
  rangeHasMark,
  sliceVisible,
  spansFromLeaves,
  styleAt,
} from './noteStyle';

const BOLD = [
  { start: 6, end: 11, bold: true, underline: false, link: false },
];

describe('styleAt / inheritStyle', () => {
  it('reads the span covering a character', () => {
    expect(styleAt(BOLD, 6)).toEqual({
      bold: true,
      underline: false,
      link: false,
    });
    expect(styleAt(BOLD, 5)).toEqual({
      bold: false,
      underline: false,
      link: false,
    });
  });

  it('inherits the style to the left when typing', () => {
    expect(inheritStyle('hello world', BOLD, 11)).toEqual({
      bold: true,
      underline: false,
      link: false,
    });
    expect(inheritStyle('hello world', BOLD, 6)).toEqual({
      bold: false,
      underline: false,
      link: false,
    });
  });
});

describe('insertVisible / deleteVisible', () => {
  it('keeps typing at the end of a bold run bold', () => {
    expect(insertVisible('hello world', BOLD, 11, '!')).toEqual({
      text: 'hello world!',
      spans: [
        { start: 6, end: 12, bold: true, underline: false, link: false },
      ],
    });
  });

  it('uses an explicit style instead of inheriting', () => {
    expect(
      insertVisible('hello world', BOLD, 11, '!', {
        bold: false,
        underline: true,
        link: false,
      }),
    ).toEqual({
      text: 'hello world!',
      spans: [
        { start: 6, end: 11, bold: true, underline: false, link: false },
        { start: 11, end: 12, bold: false, underline: true, link: false },
      ],
    });
  });

  it('shifts later spans when characters are removed', () => {
    expect(deleteVisible('hello world', BOLD, 0, 6)).toEqual({
      text: 'world',
      spans: [
        { start: 0, end: 5, bold: true, underline: false, link: false },
      ],
    });
  });
});

describe('sliceVisible / concatVisible', () => {
  it('splits a styled line and joins the pieces back', () => {
    const head = sliceVisible('hello world', BOLD, 0, 6);
    const tail = sliceVisible('hello world', BOLD, 6, 11);
    expect(head).toEqual({ text: 'hello ' });
    expect(tail).toEqual({
      text: 'world',
      spans: [
        { start: 0, end: 5, bold: true, underline: false, link: false },
      ],
    });
    expect(concatVisible(head, tail)).toEqual({
      text: 'hello world',
      spans: BOLD,
    });
  });
});

describe('applyMark / rangeHasMark', () => {
  it('makes a selected word bold, then turns bold off when the whole range is bold', () => {
    const marked = applyMark('hello world', undefined, 6, 11, 'bold', true);
    expect(marked).toEqual({
      text: 'hello world',
      spans: BOLD,
    });
    expect(rangeHasMark(marked.text, marked.spans, 6, 11, 'bold')).toBe(true);
    expect(applyMark(marked.text, marked.spans, 6, 11, 'bold', false)).toEqual({
      text: 'hello world',
    });
  });

  it('can bold and underline the same letters', () => {
    const bold = applyMark('hi', undefined, 0, 2, 'bold', true);
    expect(applyMark(bold.text, bold.spans, 0, 2, 'underline', true)).toEqual({
      text: 'hi',
      spans: [
        { start: 0, end: 2, bold: true, underline: true, link: false },
      ],
    });
  });

  it('stamps and clears a link mark without dropping bold', () => {
    const bold = applyMark('https://x.com', undefined, 0, 13, 'bold', true);
    const linked = applyMark(bold.text, bold.spans, 0, 13, 'link', true);
    expect(linked.spans).toEqual([
      { start: 0, end: 13, bold: true, underline: false, link: true },
    ]);
    expect(
      applyMark(linked.text, linked.spans, 0, 13, 'link', false).spans,
    ).toEqual([{ start: 0, end: 13, bold: true, underline: false, link: false }]);
  });
});

describe('spansFromLeaves', () => {
  it('merges neighbouring leaves that share a style', () => {
    expect(
      spansFromLeaves([
        { text: 'he', bold: true, underline: false, link: false },
        { text: 'llo', bold: true, underline: false, link: false },
        { text: '!', bold: false, underline: false, link: false },
      ]),
    ).toEqual({
      text: 'hello!',
      spans: [
        { start: 0, end: 5, bold: true, underline: false, link: false },
      ],
    });
  });
});
