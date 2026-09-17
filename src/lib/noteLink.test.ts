import { describe, expect, it } from 'vitest';
import { fallbackPreview, isBlockedHost, isUrlLine } from './noteLink';

describe('isUrlLine', () => {
  it('accepts http and https with a host, and ignores end spaces', () => {
    expect(isUrlLine('https://github.com/JeffTiong1031')).toBe(true);
    expect(isUrlLine('http://example.com')).toBe(true);
    expect(isUrlLine('  https://github.com/JeffTiong1031  ')).toBe(true);
  });

  it('rejects extra words, missing scheme, and javascript', () => {
    expect(
      isUrlLine('see https://github.com/JeffTiong1031 later'),
    ).toBe(false);
    expect(isUrlLine('www.github.com/JeffTiong1031')).toBe(false);
    expect(isUrlLine('javascript:alert(1)')).toBe(false);
    expect(isUrlLine('https://localhost/secret')).toBe(false);
  });
});

describe('isBlockedHost', () => {
  it('blocks loopback, private, and link-local names', () => {
    expect(isBlockedHost('localhost')).toBe(true);
    expect(isBlockedHost('127.0.0.1')).toBe(true);
    expect(isBlockedHost('10.0.0.1')).toBe(true);
    expect(isBlockedHost('192.168.0.1')).toBe(true);
    expect(isBlockedHost('169.254.169.254')).toBe(true);
    expect(isBlockedHost('github.com')).toBe(false);
  });
});

describe('fallbackPreview', () => {
  it('builds name and site from the address', () => {
    expect(fallbackPreview('https://github.com/JeffTiong1031')).toEqual({
      href: 'https://github.com/JeffTiong1031',
      name: 'JeffTiong1031',
      site: 'github.com',
      text: '',
      icon: null,
    });
  });
});
