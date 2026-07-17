'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { parseAudioUrl } from '@/utils/audioParser';
import { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { ChevronDown, ChevronUp, GripHorizontal, Music2 } from 'lucide-react';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function AudioPlayer() {
  const { settings } = useTimerStore();
  const mounted = useHasMounted();
  const [collapsed, setCollapsed] = useState(true);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const isMdUp = useIsMdUp();

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!mounted || !settings.audioUrl) return null;

  const parsed = parseAudioUrl(settings.audioUrl);
  if (!parsed.platform) return null;

  const defaultWidth = Math.min(300, viewport.w - 32);
  const defaultHeight = parsed.platform === 'spotify' ? 152 : 169;
  const bottomOffset = isMdUp ? 24 : 88;

  const iframe = (
    <>
      {parsed.platform === 'spotify' && (
        <iframe
          src={`https://open.spotify.com/embed/${parsed.type}/${parsed.id}`}
          width="100%"
          height="100%"
          allow="encrypted-media"
          className="border-0 bg-transparent block"
          title="Spotify Player"
        />
      )}
      {parsed.platform === 'youtube' && (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${parsed.id}?autoplay=0&rel=0`}
          title="YouTube Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="border-0 block"
        />
      )}
    </>
  );

  if (!isMdUp) {
    return (
      <div
        className="fixed z-40 left-3 right-3 rounded-2xl overflow-hidden border border-white/10 bg-[#121212] shadow-2xl"
        style={{ bottom: `calc(var(--mt-safe-bottom) + ${bottomOffset}px)` }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full min-h-11 px-3 flex items-center justify-between gap-2 text-white/80 bg-[#1a1a1a]"
          aria-expanded={!collapsed}
          aria-controls="mobile-audio-panel"
        >
          <span className="inline-flex items-center gap-2 text-sm">
            <Music2 size={16} aria-hidden />
            Focus audio
          </span>
          {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {!collapsed && (
          <div id="mobile-audio-panel" className="h-[152px] no-drag">
            {iframe}
          </div>
        )}
      </div>
    );
  }

  return (
    <Rnd
      key={`${viewport.w}x${viewport.h}`}
      default={{
        x: Math.max(16, viewport.w - defaultWidth - 24),
        y: Math.max(16, viewport.h - defaultHeight - bottomOffset - 28),
        width: defaultWidth,
        height: defaultHeight + 28,
      }}
      minWidth={200}
      minHeight={100}
      bounds="window"
      className="z-40"
      cancel=".no-drag"
    >
      <div className="w-full h-full flex flex-col bg-[#121212] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 group">
        <div className="w-full h-7 bg-[#1a1a1a] flex items-center justify-center cursor-move text-white/30 group-hover:text-white/70 transition-colors">
          <GripHorizontal size={16} aria-hidden />
          <span className="sr-only">Drag audio player</span>
        </div>
        <div className="flex-1 w-full h-full no-drag">{iframe}</div>
      </div>
    </Rnd>
  );
}
