import { describe, expect, it } from 'vitest';
import {
  resolveBackgroundFromThemeId,
  validateMediaFile,
  shouldUseAnimatedBackground,
  detectMediaKind,
} from '@/lib/backgrounds';

describe('resolveBackgroundFromThemeId', () => {
  it('maps none and empty to gradient', () => {
    expect(resolveBackgroundFromThemeId('none')).toEqual({ type: 'gradient', id: 'none' });
    expect(resolveBackgroundFromThemeId(null)).toEqual({ type: 'gradient', id: 'none' });
  });

  it('maps custom to custom image source', () => {
    expect(resolveBackgroundFromThemeId('custom')).toEqual({ type: 'custom', kind: 'image' });
  });

  it('maps known preset paths', () => {
    expect(resolveBackgroundFromThemeId('/themes/cafe.png')).toEqual({
      type: 'preset',
      id: '/themes/cafe.png',
      kind: 'image',
    });
    expect(resolveBackgroundFromThemeId('live:rain-city')).toEqual({
      type: 'preset',
      id: 'live:rain-city',
      kind: 'video',
    });
  });
});

describe('validateMediaFile', () => {
  it('rejects unsupported types', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    const result = validateMediaFile(file);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unsupported/i);
  });

  it('accepts png images under the size limit', () => {
    const file = new File([new Uint8Array(10)], 'bg.png', { type: 'image/png' });
    const result = validateMediaFile(file);
    expect(result).toEqual({ ok: true, kind: 'image' });
  });

  it('rejects oversized videos', () => {
    const big = new File([new Uint8Array(81 * 1024 * 1024)], 'clip.mp4', {
      type: 'video/mp4',
    });
    const result = validateMediaFile(big);
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('video');
  });
});

describe('detectMediaKind', () => {
  it('falls back to extension when mime is empty', () => {
    const file = new File(['x'], 'loop.webm', { type: '' });
    expect(detectMediaKind(file)).toBe('video');
  });
});

describe('shouldUseAnimatedBackground', () => {
  it('disables for reduced motion and save-data', () => {
    expect(
      shouldUseAnimatedBackground({
        prefersReducedMotion: true,
        saveData: false,
      })
    ).toBe(false);
    expect(
      shouldUseAnimatedBackground({
        prefersReducedMotion: false,
        saveData: true,
      })
    ).toBe(false);
    expect(
      shouldUseAnimatedBackground({
        prefersReducedMotion: false,
        saveData: false,
        effectiveType: '2g',
      })
    ).toBe(false);
  });

  it('enables on normal conditions', () => {
    expect(
      shouldUseAnimatedBackground({
        prefersReducedMotion: false,
        saveData: false,
        effectiveType: '4g',
      })
    ).toBe(true);
  });
});
