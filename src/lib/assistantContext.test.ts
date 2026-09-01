import { describe, it, expect } from 'vitest';
import {
  assignHandles,
  emptyHandleMap,
  handleOf,
  idOf,
} from './assistantContext';

describe('assignHandles', () => {
  it('numbers rows from one, in order', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);
    expect(handleOf(map, 'aaa')).toBe('t1');
    expect(handleOf(map, 'bbb')).toBe('t2');
    expect(handleOf(map, 'ccc')).toBe('t3');
  });

  it('keeps a handle when the same row comes back', () => {
    const first = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
    const second = assignHandles(first, ['aaa', 'bbb']);
    expect(handleOf(second, 'aaa')).toBe('t1');
    expect(handleOf(second, 'bbb')).toBe('t2');
  });

  it('never lets a handle change meaning after a row is deleted', () => {
    const turnOne = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);
    const turnTwo = assignHandles(turnOne, ['aaa', 'ccc']);
    const turnThree = assignHandles(turnTwo, ['aaa', 'ccc', 'ddd']);

    expect(idOf(turnThree, 't1')).toBe('aaa');
    expect(idOf(turnThree, 't2')).toBe('bbb');
    expect(idOf(turnThree, 't3')).toBe('ccc');
    expect(idOf(turnThree, 't4')).toBe('ddd');
  });

  it('keeps a deleted row resolvable so a plan aimed at it can be caught', () => {
    const turnOne = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
    const turnTwo = assignHandles(turnOne, ['aaa']);
    expect(idOf(turnTwo, 't2')).toBe('bbb');
  });

  it('returns null for a handle it never issued', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(idOf(map, 't99')).toBeNull();
  });

  it('uses the prefix it was given', () => {
    const map = assignHandles(emptyHandleMap('e'), ['aaa']);
    expect(handleOf(map, 'aaa')).toBe('e1');
  });

  it('does not mutate the map it was given', () => {
    const first = emptyHandleMap('t');
    assignHandles(first, ['aaa']);
    expect(first.next).toBe(1);
    expect(handleOf(first, 'aaa')).toBeNull();
  });
});
