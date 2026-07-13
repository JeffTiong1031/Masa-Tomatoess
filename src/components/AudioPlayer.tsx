'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { parseAudioUrl } from '@/utils/audioParser';
import { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { GripHorizontal } from 'lucide-react';

export default function AudioPlayer() {
  const { settings } = useTimerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !settings.audioUrl) return null;

  const parsed = parseAudioUrl(settings.audioUrl);

  if (!parsed.platform) return null;

  const defaultWidth = 300;
  const defaultHeight = parsed.platform === 'spotify' ? 152 : 169;

  return (
    <Rnd
      default={{
        x: window.innerWidth - defaultWidth - 24, // 24px from right
        y: window.innerHeight - defaultHeight - 24, // 24px from bottom
        width: defaultWidth,
        height: defaultHeight + 28, // +28px for the drag handle
      }}
      minWidth={200}
      minHeight={100}
      bounds="window"
      className="z-50"
      cancel=".no-drag" // Prevent dragging when interacting with iframe
    >
      <div className="w-full h-full flex flex-col bg-[#121212] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 group">
        
        {/* Drag Handle */}
        <div className="w-full h-7 bg-[#1a1a1a] flex items-center justify-center cursor-move text-white/30 group-hover:text-white/70 transition-colors">
          <GripHorizontal size={16} />
        </div>

        {/* Player Container */}
        <div className="flex-1 w-full h-full no-drag">
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
        </div>
      </div>
    </Rnd>
  );
}
