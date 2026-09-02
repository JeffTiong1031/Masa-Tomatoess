import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function ruleBody(selector: string): string {
  const index = CSS.indexOf(selector);
  if (index === -1) return '';
  const braceStart = CSS.indexOf('{', index);
  const braceEnd = CSS.indexOf('}', braceStart);
  return CSS.slice(braceStart + 1, braceEnd);
}

describe('the assistant floating button on Study', () => {
  it('is raised above the bottom bar by a rule scoped to data-section study', () => {
    const body = ruleBody("[data-section='study'] .mt-assistant-fab");
    expect(body).not.toBe('');
    expect(body).toMatch(/bottom:\s*calc\(/);
    expect(body).toContain('var(--mt-nav-height)');
  });
});
