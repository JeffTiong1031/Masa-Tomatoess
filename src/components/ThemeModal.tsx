'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { Palette, X, Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { set } from 'idb-keyval';

export default function ThemeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings } = useTimerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultThemes = [
    { id: 'none', name: 'Default Gradient', src: '' },
    { id: '/themes/cafe.png', name: 'Lofi Cafe', src: '/themes/cafe.png' },
    { id: '/themes/dark.png', name: 'Minimalist Dark', src: '/themes/dark.png' },
    { id: '/themes/nature.png', name: 'Nature Retreat', src: '/themes/nature.png' },
  ];

  const handleThemeSelect = (themeId: string) => {
    updateSettings({ themeId });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await set('custom-theme-file', file);
        updateSettings({ themeId: 'custom' });
        // Dispatch event to notify page.tsx to reload custom theme
        window.dispatchEvent(new Event('custom-theme-updated'));
      } catch (err) {
        console.error('Failed to save custom theme:', err);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-6 right-20 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all"
        title="Theme Manager"
      >
        <Palette size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] text-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-light mb-6 tracking-wide">Theme Manager</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {defaultThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`relative aspect-video rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                    settings.themeId === theme.id ? 'ring-4 ring-blue-500 scale-[1.02]' : 'ring-1 ring-white/10'
                  }`}
                >
                  {theme.id === 'none' ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 via-zinc-900 to-purple-900" />
                  ) : (
                    <img src={theme.src} alt={theme.name} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-end p-2 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium">{theme.name}</span>
                  </div>
                </button>
              ))}

              {/* Upload Custom Card */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-xl flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-300 ${
                  settings.themeId === 'custom' ? 'ring-4 ring-blue-500 scale-[1.02]' : 'ring-1 ring-white/10'
                }`}
              >
                <Upload size={24} className="text-white/50 mb-2" />
                <span className="text-xs font-medium text-white/50">Upload Custom</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
