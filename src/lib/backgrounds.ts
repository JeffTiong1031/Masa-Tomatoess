export type BackgroundKind = 'gradient' | 'image' | 'video';

export type BackgroundSource =
  | { type: 'gradient'; id: 'none' }
  | { type: 'preset'; id: string; kind: 'image' | 'video' }
  | { type: 'custom'; kind: 'image' | 'video' };

export interface BackgroundPreset {
  id: string;
  name: string;
  kind: 'image' | 'video';
  src: string;
  poster?: string;
}

/** Max upload size: 25MB for images, 80MB for videos (local-only). */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const CUSTOM_THEME_IDB_KEY = 'custom-theme-file';
export const CUSTOM_THEME_META_KEY = 'custom-theme-meta';

/**
 * Curated "video" presets use lightweight CSS/canvas live loops (`live:*`)
 * so phones stay performant; users can still upload real MP4/WebM locally.
 */
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: '/themes/cafe.png',
    name: 'Lofi Cafe',
    kind: 'image',
    src: '/themes/cafe.png',
  },
  {
    id: '/themes/dark.png',
    name: 'Minimalist Dark',
    kind: 'image',
    src: '/themes/dark.png',
  },
  {
    id: '/themes/nature.png',
    name: 'Nature Retreat',
    kind: 'image',
    src: '/themes/nature.png',
  },
  {
    id: 'live:rain-city',
    name: 'Rainy City',
    kind: 'video',
    src: 'live:rain-city',
    poster: '/themes/dark.png',
  },
  {
    id: 'live:ocean-dusk',
    name: 'Ocean Dusk',
    kind: 'video',
    src: 'live:ocean-dusk',
    poster: '/themes/nature.png',
  },
  {
    id: 'live:aurora',
    name: 'Aurora Night',
    kind: 'video',
    src: 'live:aurora',
    poster: '/themes/cafe.png',
  },
];

export function isLivePresetId(id: string): boolean {
  return id.startsWith('live:');
}

export interface CustomThemeMeta {
  kind: 'image' | 'video';
  name: string;
  mimeType: string;
  size: number;
  updatedAt: number;
}

/** Migrate legacy themeId values into a resolved preset or custom source. */
export function resolveBackgroundFromThemeId(
  themeId: string | undefined | null
): BackgroundSource {
  if (!themeId || themeId === 'none') {
    return { type: 'gradient', id: 'none' };
  }
  if (themeId === 'custom') {
    return { type: 'custom', kind: 'image' };
  }
  const preset = BACKGROUND_PRESETS.find((p) => p.id === themeId);
  if (preset) {
    return { type: 'preset', id: preset.id, kind: preset.kind };
  }
  if (isLivePresetId(themeId)) {
    return { type: 'preset', id: themeId, kind: 'video' };
  }
  // Legacy path-style theme ids (e.g. /themes/cafe.png)
  if (themeId.startsWith('/themes/')) {
    const kind =
      themeId.endsWith('.mp4') || themeId.endsWith('.webm') ? 'video' : 'image';
    return { type: 'preset', id: themeId, kind };
  }
  return { type: 'gradient', id: 'none' };
}

export function getPresetById(id: string): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS.find((p) => p.id === id);
}

export function detectMediaKind(file: File): 'image' | 'video' | null {
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'image';
  if ((ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.type)) return 'video';
  // Fallback by extension when browsers omit MIME
  const name = file.name.toLowerCase();
  if (/\.(jpe?g|png|webp|gif)$/.test(name)) return 'image';
  if (/\.(mp4|webm|mov)$/.test(name)) return 'video';
  return null;
}

export interface MediaValidationResult {
  ok: boolean;
  kind?: 'image' | 'video';
  error?: string;
}

export function validateMediaFile(file: File): MediaValidationResult {
  const kind = detectMediaKind(file);
  if (!kind) {
    return {
      ok: false,
      error: 'Unsupported file. Use JPG, PNG, WebP, GIF, MP4, or WebM.',
    };
  }
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    return {
      ok: false,
      kind,
      error: `${kind === 'image' ? 'Image' : 'Video'} must be under ${mb}MB.`,
    };
  }
  return { ok: true, kind };
}

export function shouldUseAnimatedBackground(options: {
  prefersReducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
}): boolean {
  if (options.prefersReducedMotion) return false;
  if (options.saveData) return false;
  const slow = options.effectiveType === 'slow-2g' || options.effectiveType === '2g';
  if (slow) return false;
  return true;
}
