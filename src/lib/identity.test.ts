import { describe, expect, it } from 'vitest';
import { USERS, isUserName, partnerOf } from './identity';

describe('USERS', () => {
  it('holds exactly the two people who use the app', () => {
    expect(USERS).toEqual(['Jeff', 'Rachel']);
  });
});

describe('partnerOf', () => {
  it('resolves Jeff to Rachel', () => {
    expect(partnerOf('Jeff')).toBe('Rachel');
  });

  it('resolves Rachel to Jeff', () => {
    expect(partnerOf('Rachel')).toBe('Jeff');
  });
});

describe('isUserName', () => {
  it('accepts a stored name that matches a user', () => {
    expect(isUserName('Jeff')).toBe(true);
    expect(isUserName('Rachel')).toBe(true);
  });

  it('rejects a missing or unrecognised stored value', () => {
    expect(isUserName(null)).toBe(false);
    expect(isUserName('')).toBe(false);
    expect(isUserName('jeff')).toBe(false);
    expect(isUserName('Somebody')).toBe(false);
  });
});
