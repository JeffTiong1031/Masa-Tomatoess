import { get, set, del } from 'idb-keyval';
import {
  CUSTOM_THEME_IDB_KEY,
  CUSTOM_THEME_META_KEY,
  type CustomThemeMeta,
  validateMediaFile,
} from '@/lib/backgrounds';

export async function loadCustomThemeFile(): Promise<File | Blob | null> {
  try {
    const file = await get<File | Blob>(CUSTOM_THEME_IDB_KEY);
    return file ?? null;
  } catch {
    return null;
  }
}

export async function loadCustomThemeMeta(): Promise<CustomThemeMeta | null> {
  try {
    const meta = await get<CustomThemeMeta>(CUSTOM_THEME_META_KEY);
    return meta ?? null;
  } catch {
    return null;
  }
}

export async function saveCustomTheme(file: File): Promise<{
  ok: boolean;
  meta?: CustomThemeMeta;
  error?: string;
}> {
  const validation = validateMediaFile(file);
  if (!validation.ok || !validation.kind) {
    return { ok: false, error: validation.error ?? 'Invalid file' };
  }

  const meta: CustomThemeMeta = {
    kind: validation.kind,
    name: file.name,
    mimeType: file.type || (validation.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    size: file.size,
    updatedAt: Date.now(),
  };

  try {
    await set(CUSTOM_THEME_IDB_KEY, file);
    await set(CUSTOM_THEME_META_KEY, meta);
    return { ok: true, meta };
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'QuotaExceededError'
        ? 'Storage is full. Try a smaller file or clear old data.'
        : 'Failed to save background on this device.';
    return { ok: false, error: message };
  }
}

export async function clearCustomTheme(): Promise<void> {
  await del(CUSTOM_THEME_IDB_KEY);
  await del(CUSTOM_THEME_META_KEY);
}
