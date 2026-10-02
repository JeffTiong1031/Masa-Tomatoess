export type KeypadKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | '.'
  | 'back';

const MAX_WHOLE_DIGITS = 7;

export function formatRM(sen: number): string {
  const magnitude = Math.abs(sen);
  const ringgit = Math.floor(magnitude / 100).toLocaleString('en-US');
  const cents = `${magnitude % 100}`.padStart(2, '0');
  return `${sen < 0 ? '−' : ''}RM ${ringgit}.${cents}`;
}

export function pressKey(input: string, key: string): string {
  if (key === 'back') return input.slice(0, -1);
  const [whole, fraction] = input.split('.');
  if (key === '.') {
    if (fraction !== undefined) return input;
    return `${whole === '' ? '0' : whole}.`;
  }
  if (fraction !== undefined) {
    return fraction.length >= 2 ? input : `${input}${key}`;
  }
  if (whole === '0') return key;
  if (whole.length >= MAX_WHOLE_DIGITS) return input;
  return `${input}${key}`;
}

export function inputToSen(input: string): number {
  const [whole, fraction = ''] = input.split('.');
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}

export function senToInput(sen: number): string {
  return `${Math.floor(sen / 100)}.${`${sen % 100}`.padStart(2, '0')}`;
}
