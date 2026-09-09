import { describe, it, expect } from 'vitest';
import { NOTE_MARK_START, NOTE_MARK_SEP } from './noteDoc';
import { copyOut, stripIncoming, joinIntoLine } from './noteCopy';

describe('copyOut', () => {
  it('writes ticks and two spaces per indent', () => {
    expect(
      copyOut([
        { kind: 'item', text: 'Parent', checked: true, indent: 0 },
        { kind: 'item', text: 'Child', checked: false, indent: 1 },
        { kind: 'paragraph', text: 'After' },
      ]),
    ).toBe('[x] Parent\n  [ ] Child\nAfter');
  });
});

describe('stripIncoming', () => {
  it('strips private marks and leaves visible [x] alone', () => {
    expect(stripIncoming(`${NOTE_MARK_START}1/0${NOTE_MARK_SEP}Eggs`)).toBe('1/0Eggs');
    expect(stripIncoming('[x] Eggs')).toBe('[x] Eggs');
  });
});

describe('joinIntoLine', () => {
  it('joins several pasted lines onto one line', () => {
    expect(joinIntoLine('one\ntwo\nthree')).toBe('one two three');
  });
});
