import { fallbackPreview, type LinkPreview } from './noteLink';

function metaByProperty(html: string, property: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+property\\s*=\\s*["']${property}["'][^>]+content\\s*=\\s*["']([^"']*)["']`,
    'i',
  );
  const re2 = new RegExp(
    `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+property\\s*=\\s*["']${property}["']`,
    'i',
  );
  return html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? null;
}

function metaByName(html: string, name: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+name\\s*=\\s*["']${name}["'][^>]+content\\s*=\\s*["']([^"']*)["']`,
    'i',
  );
  const re2 = new RegExp(
    `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+name\\s*=\\s*["']${name}["']`,
    'i',
  );
  return html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? null;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function capText(text: string, max: number): string {
  const collapsed = collapseWhitespace(text);
  if (collapsed.length <= max) {
    return collapsed;
  }
  return collapsed.slice(0, max);
}

function titleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return null;
  }
  const collapsed = collapseWhitespace(match[1]);
  return collapsed.length > 0 ? collapsed : null;
}

function resolveIcon(raw: string, href: string): string | null {
  try {
    return new URL(raw, href).href;
  } catch {
    return null;
  }
}

function iconFromHtml(html: string, href: string): string | null {
  const ogImage = metaByProperty(html, 'og:image');
  if (ogImage) {
    return resolveIcon(ogImage, href);
  }
  const re1 =
    /<link[^>]+rel\s*=\s*["'][^"']*icon[^"']*["'][^>]+href\s*=\s*["']([^"']*)["']/i;
  const re2 =
    /<link[^>]+href\s*=\s*["']([^"']*)["'][^>]+rel\s*=\s*["'][^"']*icon[^"']*["']/i;
  const raw = html.match(re1)?.[1] ?? html.match(re2)?.[1];
  if (!raw) {
    return null;
  }
  return resolveIcon(raw, href);
}

function nameFromHtml(html: string): string | null {
  const ogTitle = metaByProperty(html, 'og:title');
  if (ogTitle && collapseWhitespace(ogTitle).length > 0) {
    return collapseWhitespace(ogTitle);
  }
  const twitterTitle = metaByName(html, 'twitter:title');
  if (twitterTitle && collapseWhitespace(twitterTitle).length > 0) {
    return collapseWhitespace(twitterTitle);
  }
  return titleFromHtml(html);
}

function textFromHtml(html: string): string | null {
  const ogDescription = metaByProperty(html, 'og:description');
  if (ogDescription && collapseWhitespace(ogDescription).length > 0) {
    return capText(ogDescription, 180);
  }
  const description = metaByName(html, 'description');
  if (description && collapseWhitespace(description).length > 0) {
    return capText(description, 180);
  }
  return null;
}

export function previewFromHtml(html: string, href: string): LinkPreview {
  const preview = fallbackPreview(href);
  const name = nameFromHtml(html);
  const text = textFromHtml(html);
  const icon = iconFromHtml(html, href);
  return {
    href: preview.href,
    name: name ?? preview.name,
    site: preview.site,
    text: text ?? preview.text,
    icon: icon ?? preview.icon,
  };
}
