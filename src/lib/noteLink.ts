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

function normalizeHost(host: string): string {
  let normalized = host.toLowerCase();
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }
  while (normalized.endsWith('.')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function ipv4FromMapped(host: string): string | null {
  const dotted = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    return dotted[1];
  }
  const hex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) {
    return null;
  }
  const hi = Number.parseInt(hex[1], 16);
  const lo = Number.parseInt(hex[2], 16);
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

function isLoopbackIpv4(host: string): boolean {
  const octets = ipv4Octets(host);
  return octets !== null && octets[0] === 127;
}

export function isBlockedHost(host: string): boolean {
  const normalized = normalizeHost(host);
  if (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  ) {
    return true;
  }
  if (normalized.endsWith('.local')) {
    return true;
  }
  const ipv4 = ipv4FromMapped(normalized) ?? normalized;
  if (isLoopbackIpv4(ipv4) || ipv4 === '0.0.0.0') {
    return true;
  }
  return isPrivateIpv4(ipv4);
}

export function urlRanges(
  text: string,
): { start: number; end: number; href: string }[] {
  const ranges: { start: number; end: number; href: string }[] = [];
  const pattern = /https?:\/\/[^\s]+/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const href = match[0];
    if (!isUrlLine(href)) continue;
    ranges.push({
      start: match.index,
      end: match.index + href.length,
      href,
    });
  }
  return ranges;
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
  if (!isUrlLine(trimmed)) {
    return {
      href: trimmed,
      name: trimmed,
      site: '',
      text: '',
      icon: null,
    };
  }
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
