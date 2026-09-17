export type LinkPreview = {
  href: string;
  name: string;
  site: string;
  text: string;
  icon: string | null;
};

const URL_LINE = /^https?:\/\/[^/\s?#]+/;

function ipv4Octets(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) {
    return null;
  }
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isPrivateIpv4(host: string): boolean {
  const octets = ipv4Octets(host);
  if (!octets) {
    return false;
  }
  const [a, b] = octets;
  if (a === 10) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  return false;
}

export function isBlockedHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '[::1]' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  ) {
    return true;
  }
  if (normalized.endsWith('.local')) {
    return true;
  }
  return isPrivateIpv4(normalized);
}

export function isUrlLine(text: string): boolean {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) {
    return false;
  }
  if (!URL_LINE.test(trimmed)) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  if (isBlockedHost(url.hostname)) {
    return false;
  }
  return true;
}

export function fallbackPreview(href: string): LinkPreview {
  const trimmed = href.trim();
  const url = new URL(trimmed);
  const site = url.hostname.replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  const name = segments.length > 0 ? segments[segments.length - 1] : site;
  return {
    href: trimmed,
    name,
    site,
    text: '',
    icon: null,
  };
}
