'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useState } from 'react';
import { get } from 'idb-keyval';

export default function BackgroundManager() {
  const { settings } = useTimerStore();
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  const loadCustomTheme = async () => {
    try {
      const file = await get<File>('custom-theme-file');
      if (file) {
        const url = URL.createObjectURL(file);
        setCustomUrl(url);
      }
    } catch (err) {
      console.error('Failed to load custom theme from IndexedDB:', err);
    }
  };

  useEffect(() => {
    if (settings.themeId === 'custom') {
      loadCustomTheme();
    }

    // Listen for custom theme updates from ThemeModal
    const handleUpdate = () => {
      if (settings.themeId === 'custom') {
        loadCustomTheme();
      }
    };
    
    window.addEventListener('custom-theme-updated', handleUpdate);
    return () => {
      window.removeEventListener('custom-theme-updated', handleUpdate);
      if (customUrl) {
        URL.revokeObjectURL(customUrl); // cleanup
      }
    };
  }, [settings.themeId]);

  let backgroundStyle: React.CSSProperties = {};

  if (settings.themeId === 'none') {
    // Default gradient is handled by CSS classes on the div
  } else if (settings.themeId === 'custom' && customUrl) {
    backgroundStyle = { backgroundImage: `url(${customUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  } else if (settings.themeId !== 'custom' && settings.themeId !== 'none') {
    backgroundStyle = { backgroundImage: `url(${settings.themeId})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }

  return (
    <div 
      className={`absolute inset-0 z-0 transition-all duration-1000 ease-in-out ${settings.themeId === 'none' ? 'bg-gradient-to-br from-blue-900/20 via-zinc-950 to-purple-900/20' : 'bg-black/50'}`}
      style={backgroundStyle}
    >
      {/* If an image is set, add a dark overlay for readability */}
      {settings.themeId !== 'none' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      )}
    </div>
  );
}
