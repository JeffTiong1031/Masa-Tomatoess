'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { Palette, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { BACKGROUND_PRESETS } from '@/lib/backgrounds';
import { saveCustomTheme } from '@/lib/backgroundStorage';
export default function ThemeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { settings, updateSettings } = useTimerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeSelect = (themeId: string) => {
    setError(null);
    updateSettings({ themeId });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await saveCustomTheme(file);
    setUploading(false);
    if (!result.ok) {
      setError(result.error ?? 'Upload failed');
      return;
    }
    updateSettings({ themeId: 'custom' });
    window.dispatchEvent(new Event('custom-theme-updated'));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="absolute z-40 min-h-11 min-w-11 inline-flex items-center justify-center text-white/50 hover:text-white bg-black/25 hover:bg-black/45 rounded-full backdrop-blur-sm transition-all border border-white/10"
        style={{
          top: 'calc(var(--mt-safe-top) + 1.15rem)',
          // Leave room for the page settings button on the far right
          right: 'calc(var(--mt-safe-right) + 3.75rem)',
        }}
        title="Theme Manager"
        aria-label="Open theme manager"
      >
        <Palette size={22} />
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Theme Manager"
        variant="sheet"
        maxWidthClass="max-w-2xl"
      >
        <p className="text-sm text-white/50 mb-4">
          Live loops animate when your connection and motion preferences allow.
          Uploads stay on this device only.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleThemeSelect('none')}
            className={`relative aspect-video rounded-xl overflow-hidden transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
              settings.themeId === 'none'
                ? 'ring-2 ring-blue-500 scale-[1.01]'
                : 'ring-1 ring-white/10'
            }`}
          >
            <div className="w-full h-full bg-gradient-to-br from-blue-900 via-zinc-900 to-indigo-950" />
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5">
              <span className="text-xs font-medium">Midnight Gradient</span>
            </div>
          </button>

          {BACKGROUND_PRESETS.map((theme) => (
            <button
              type="button"
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`relative aspect-video rounded-xl overflow-hidden transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                settings.themeId === theme.id
                  ? 'ring-2 ring-blue-500 scale-[1.01]'
                  : 'ring-1 ring-white/10'
              }`}
            >
              {theme.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={theme.src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: theme.poster
                      ? `url(${theme.poster})`
                      : undefined,
                    backgroundColor: '#0b1628',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-700/30" />
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-black/50 px-1.5 py-0.5 rounded">
                    Live
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-left">
                <span className="text-xs font-medium">{theme.name}</span>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`relative aspect-video rounded-xl flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-all disabled:opacity-60 ${
              settings.themeId === 'custom'
                ? 'ring-2 ring-blue-500 scale-[1.01]'
                : 'ring-1 ring-white/10'
            }`}
          >
            <Upload size={22} className="text-white/50 mb-2" />
            <span className="text-xs font-medium text-white/70 px-2 text-center">
              {uploading ? 'Saving…' : 'Upload image or video'}
            </span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
