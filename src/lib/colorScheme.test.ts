import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function ruleBody(selector: string): string {
  const pattern = new RegExp(
    `(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`,
  );
  const match = pattern.exec(CSS);
  if (match === null) return '';
  const braceStart = CSS.indexOf('{', match.index);
  const braceEnd = CSS.indexOf('}', braceStart);
  return CSS.slice(braceStart + 1, braceEnd);
}

describe('native control colour scheme follows the mood', () => {
  it('tells the browser light-mood pages use light form controls', () => {
    const body = ruleBody("[data-mood='light']");
    expect(body).not.toBe('');
    expect(body).toMatch(/color-scheme:\s*light/);
  });

  it('tells the browser dark-mood pages use dark form controls', () => {
    const body = ruleBody("[data-mood='dark']");
    expect(body).not.toBe('');
    expect(body).toMatch(/color-scheme:\s*dark/);
  });
});
