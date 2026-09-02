import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio } from './color';

const CSS = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function token(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return (match as RegExpExecArray)[1];
}

describe('the assistant button', () => {
  it('keeps a cocoa icon readable on the to-do accent', () => {
    const ratio = contrastRatio(token('--mac-accent-todo'), token('--mac-cocoa'));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('is why the icon is not white', () => {
    const ratio = contrastRatio(token('--mac-accent-todo'), token('--mac-white'));
    expect(ratio).toBeLessThan(3);
  });
});
