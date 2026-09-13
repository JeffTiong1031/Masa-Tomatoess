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

describe('the assistant floating button', () => {
  it('is not raised for a bottom bar on Timetable or Study', () => {
    expect(ruleBody("[data-section='timetable'] .mt-assistant-fab")).toBe('');
    expect(ruleBody("[data-section='study'] .mt-assistant-fab")).toBe('');
  });
});
