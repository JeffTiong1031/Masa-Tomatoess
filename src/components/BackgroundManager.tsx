'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  getPresetById,
  isLivePresetId,
  resolveBackgroundFromThemeId,
  shouldUseAnimatedBackground,
} from '@/lib/backgrounds';
import { loadCustomThemeFile, loadCustomThemeMeta } from '@/lib/backgroundStorage';
import { backgroundFieldFor } from '@/lib/backgroundField';

function readConnectionFlags() {
  if (typeof navigator === 'undefined') {
    return { saveData: false, effectiveType: undefined as string | undefined };
  }
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return {
    saveData: Boolean(conn?.saveData),
    effectiveType: conn?.effectiveType,
  };
}

function LiveLoop({ id, animate }: { id: string; animate: boolean }) {
  const variant = id.replace('live:', '');
  if (!animate) {
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            variant === 'ocean-dusk'
              ? 'linear-gradient(160deg, #0b1628, #0f766e 45%, #1e3a5f)'
              : variant === 'rain-city'
              ? 'linear-gradient(160deg, #09090b, #1e293b 50%, #312e81)'
              : 'linear-gradient(160deg, #0b1628, #1e3a5f, #4c1d95)',
        }}
      />
    );
  }

  if (variant === 'ocean-dusk') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-teal-950 to-indigo-950" />
        <div className="absolute -inset-[20%] opacity-60 blur-3xl mt-live-gradient" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-900/40 to-transparent" />
      </div>
    );
  }

  if (variant === 'rain-city') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-zinc-900 to-black" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, transparent 0 8px, rgba(148,163,184,0.25) 8px 9px)',
            animation: 'mt-aurora 12s linear infinite',
            backgroundSize: '100% 200%',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.25),transparent_45%)]" />
      </div>
    );
  }

  // aurora default
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 mt-live-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_55%)]" />
    </div>
  );
}

/** The app's default backdrop: cream with two soft accent blobs. Every
 *  route lands here except the two timing widgets carrying a wallpaper. */
function PlainField() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[var(--mac-cream)]">
      <div
        className="absolute -left-[15%] -top-[10%] h-[55vh] w-[55vh] rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--mac-accent-cycle)' }}
      />
      <div
        className="absolute -bottom-[15%] -right-[10%] h-[60vh] w-[60vh] rounded-full opacity-35 blur-3xl"
        style={{ background: 'var(--mac-accent-countdown)' }}
      />
    </div>
  );
}

export default function BackgroundManager() {
  const pathname = usePathname();
  const field = backgroundFieldFor(pathname);
  const { settings } = useTimerStore();
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [customKind, setCustomKind] = useState<'image' | 'video'>('image');
  const [animate, setAnimate] = useState(true);

  const source = useMemo(
    () => resolveBackgroundFromThemeId(settings.themeId),
    [settings.themeId]
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const { saveData, effectiveType } = readConnectionFlags();
      setAnimate(
        shouldUseAnimatedBackground({
          prefersReducedMotion: motionQuery.matches,
          saveData,
          effectiveType,
        })
      );
    };
    update();
    motionQuery.addEventListener('change', update);
    return () => motionQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    const loadCustom = async () => {
      if (source.type !== 'custom') {
        setCustomUrl(null);
        return;
      }
      try {
        const [file, meta] = await Promise.all([
          loadCustomThemeFile(),
          loadCustomThemeMeta(),
        ]);
        if (cancelled) return;
        if (meta?.kind) setCustomKind(meta.kind);
        else if (file && 'type' in file && typeof file.type === 'string') {
          setCustomKind(file.type.startsWith('video/') ? 'video' : 'image');
        }
        if (file) {
          const url = URL.createObjectURL(file);
          revoked = url;
          setCustomUrl(url);
        } else {
          setCustomUrl(null);
        }
      } catch (err) {
        console.error('Failed to load custom theme from IndexedDB:', err);
      }
    };

    loadCustom();

    const handleUpdate = () => {
      if (source.type === 'custom') loadCustom();
    };
    window.addEventListener('custom-theme-updated', handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('custom-theme-updated', handleUpdate);
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [source]);

  const preset =
    source.type === 'preset' ? getPresetById(source.id) : undefined;

  /* "No wallpaper" is not a background of its own any more. It used to
     paint a dark blue-to-plum gradient, which was the right default
     under a dark Focus mood and is the wrong one now -- an unveiled
     dark gradient is precisely the collision the light theme exists to
     remove. Falling through to the plain field instead means choosing
     no theme gives you the same cream the rest of the app has. */
  if (field === 'plain' || source.type === 'gradient') return <PlainField />;

  /* fixed, not absolute. The backdrop used to stretch to the full
     scroll height of whatever page it sat behind, which was harmless
     on the viewport-tall timer but zooms the photo hard on a long page
     like the dashboard. Pinning it to the viewport makes it behave the
     way a wallpaper is expected to: the content scrolls, the image
     stays put. */
  return (
    <div className="fixed inset-0 z-0 overflow-hidden transition-all duration-1000 ease-in-out">
      {source.type === 'preset' && preset && isLivePresetId(preset.id) && (
        <LiveLoop id={preset.id} animate={animate} />
      )}

      {source.type === 'preset' &&
        preset &&
        !isLivePresetId(preset.id) &&
        preset.kind === 'image' && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${preset.src})` }}
          />
        )}

      {source.type === 'custom' && customUrl && customKind === 'image' && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${customUrl})` }}
        />
      )}

      {source.type === 'custom' && customUrl && customKind === 'video' && (
        animate ? (
          <video
            key={customUrl}
            className="absolute inset-0 h-full w-full object-cover"
            src={customUrl}
            autoPlay
            muted
            loop
            playsInline
            poster={undefined}
          />
        ) : (
          /* Reduced-motion / save-data stand-in for the video. */
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--mac-shell)] to-[var(--mac-accent-flexible)] opacity-70" />
        )
      )}
    </div>
  );
}
