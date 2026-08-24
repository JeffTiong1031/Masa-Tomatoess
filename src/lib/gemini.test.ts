import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GEMINI_MODEL } from './gemini';

const ROUTES = [
  'src/app/api/meals/estimate/route.ts',
  'src/app/api/meals/review/route.ts',
];

describe('GEMINI_MODEL', () => {
  it('names a model the Interactions API returns JSON for', () => {
    expect(GEMINI_MODEL).toMatch(/^gemini-3\./);
  });
});

describe('the endpoints share one model', () => {
  it.each(ROUTES)('%s imports the constant rather than naming a model', (route) => {
    const source = readFileSync(route, 'utf8');

    expect(source).toContain('GEMINI_MODEL');

    const hardcoded = source.match(/['"`]gemini-[\w.-]+['"`]/g);
    expect(hardcoded).toBeNull();
  });
});
