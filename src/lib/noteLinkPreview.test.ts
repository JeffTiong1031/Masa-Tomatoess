import { describe, expect, it } from 'vitest';
import { previewFromHtml } from './noteLinkPreview';

const HREF = 'https://github.com/JeffTiong1031';

describe('previewFromHtml', () => {
  it('prefers og title, site name, description, and image', () => {
    const html = `
      <meta property="og:title" content="JeffTiong1031 (Tiong)">
      <meta property="og:description" content="CS (AI) undergrad">
      <meta property="og:image" content="https://github.com/icon.png">
    `;
    expect(previewFromHtml(html, HREF)).toEqual({
      href: HREF,
      name: 'JeffTiong1031 (Tiong)',
      site: 'github.com',
      text: 'CS (AI) undergrad',
      icon: 'https://github.com/icon.png',
    });
  });

  it('falls back to title and the address card when og is missing', () => {
    const html = '<title>JeffTiong1031</title>';
    const preview = previewFromHtml(html, HREF);
    expect(preview.name).toBe('JeffTiong1031');
    expect(preview.site).toBe('github.com');
    expect(preview.text).toBe('');
    expect(preview.icon).toBe(null);
  });

  it('keeps the address card when the HTML has nothing', () => {
    expect(previewFromHtml('', HREF)).toEqual(
      expect.objectContaining({
        name: 'JeffTiong1031',
        site: 'github.com',
        text: '',
        icon: null,
      }),
    );
  });
});
