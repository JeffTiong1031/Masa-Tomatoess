import { describe, expect, it } from 'vitest';
import { formatRM, inputToSen, pressKey, senToInput } from './financeMoney';

describe('formatRM', () => {
  it.each([
    [1200, 'RM 12.00'],
    [123450, 'RM 1,234.50'],
    [0, 'RM 0.00'],
    [5, 'RM 0.05'],
    [100000000, 'RM 1,000,000.00'],
    [-4050, '−RM 40.50'],
  ])('shows %i sen as %s', (sen, text) => {
    expect(formatRM(sen)).toBe(text);
  });
});

describe('the amount keypad', () => {
  const type = (keys: string[]) => keys.reduce(pressKey, '');

  it.each([
    [['1', '2'], '12', 1200],
    [['1', '2', '.', '5'], '12.5', 1250],
    [['0', '.', '0', '5'], '0.05', 5],
    [['.', '5'], '0.5', 50],
    [[], '', 0],
  ])('turns %j into %s and %i sen', (keys, input, sen) => {
    expect(type(keys)).toBe(input);
    expect(inputToSen(input)).toBe(sen);
  });

  it('refuses a third decimal digit', () => {
    expect(type(['1', '.', '2', '5', '9'])).toBe('1.25');
  });

  it('refuses a second point', () => {
    expect(type(['1', '.', '2', '.'])).toBe('1.2');
  });

  it('does not stack leading zeros', () => {
    expect(type(['0', '0', '7'])).toBe('7');
  });

  it('stops at seven whole digits', () => {
    expect(type(['1', '2', '3', '4', '5', '6', '7', '8'])).toBe('1234567');
  });

  it('deletes the last character', () => {
    expect(type(['1', '2', '.', '5', 'back'])).toBe('12.');
    expect(pressKey('', 'back')).toBe('');
  });

  it('fills the keypad back in from a saved amount', () => {
    expect(senToInput(1250)).toBe('12.50');
    expect(senToInput(1200)).toBe('12.00');
    expect(inputToSen(senToInput(123405))).toBe(123405);
  });
});
