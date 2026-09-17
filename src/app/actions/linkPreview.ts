'use server';

import { isBlockedHost, isUrlLine, type LinkPreview } from '@/lib/noteLink';
import { previewFromHtml } from '@/lib/noteLinkPreview';

export async function fetchLinkPreview(href: string): Promise<LinkPreview | null> {
  if (!isUrlLine(href)) {
    return null;
  }

  try {
    const url = new URL(href.trim());
    if (isBlockedHost(url.hostname)) {
      return null;
    }

    const response = await fetch(url.href, {
      redirect: 'follow',
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!/html/i.test(contentType)) {
      return null;
    }

    const html = (await response.text()).slice(0, 512_000);
    return previewFromHtml(html, url.href);
  } catch {
    return null;
  }
}
