'use client';

import { useFlexibleStore } from '@/store/useFlexibleStore';
import { useTimerStore } from '@/store/useTimerStore';
import { Settings, Play, Square } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { playAlarmOnce, ALARM_LABELS, type AlarmSoundId } from '@/utils/alarmSounds';
import { clampRestRatio } from '@/lib/flexibleTime';
import Modal from '@/components/ui/Modal';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function FlexibleSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { restRatio, updateRestRatio } = useFlexibleStore();
  const { settings, updateSettings } = useTimerStore();
  const [localRatio, setLocalRatio] = useState(restRatio);
  const [localAudioUrl, setLocalAudioUrl] = useState(settings.audioUrl);
  const [localAlarmSound, setLocalAlarmSound] = useState(settings.alarmSound);
  const mounted = useHasMounted();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  if (!mounted) return null;

  const exampleRestMin = Math.floor(30 / clampRestRatio(localRatio));

  const openModal = () => {
    setLocalRatio(restRatio);
    setLocalAudioUrl(settings.audioUrl);
    setLocalAlarmSound(settings.alarmSound);
    setIsOpen(true);
  };

  const handleSave = () => {
    updateRestRatio(localRatio);
    updateSettings({
      audioUrl: localAudioUrl,
      alarmSound: localAlarmSound,
    });
    setIsOpen(false);
  };

  const handlePlayPreview = () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    playAlarmOnce(localAlarmSound as AlarmSoundId);
    previewTimeoutRef.current = setTimeout(() => setIsPreviewing(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="absolute z-40 min-h-11 min-w-11 inline-flex items-center justify-center text-white/50 hover:text-white bg-black/25 hover:bg-black/45 rounded-full backdrop-blur-sm transition-all border border-white/10"
        style={{
          top: 'calc(var(--mt-safe-top) + 1.15rem)',
          right: 'calc(var(--mt-safe-right) + 1rem)',
        }}
        aria-label="Open flexible settings"
      >
        <Settings size={22} />
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Flexible Settings"
        variant="sheet"
        footer={
          <button
            type="button"
            onClick={handleSave}
            className="w-full min-h-12 py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors"
          >
            Save Changes
          </button>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-white/70 gap-3">
              <span>Rest = study ÷ N</span>
              <input
                type="number"
                min={2}
                max={10}
                step={1}
                value={localRatio}
                onChange={(e) => setLocalRatio(parseInt(e.target.value, 10) || 2)}
                onBlur={(e) =>
                  setLocalRatio(clampRestRatio(parseInt(e.target.value, 10)))
                }
                className="w-16 min-h-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
              />
            </label>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={clampRestRatio(localRatio)}
              onChange={(e) => setLocalRatio(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500"
              aria-label="Rest ratio"
            />
            <p className="text-xs text-white/50">
              Example: 30 min study → {exampleRestMin} min rest
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="flex-audio-url"
              className="flex justify-between text-sm font-medium text-white/70"
            >
              <span>Background Audio (Spotify/YouTube URL)</span>
            </label>
            <input
              id="flex-audio-url"
              type="text"
              placeholder="Paste URL here..."
              value={localAudioUrl || ''}
              onChange={(e) => setLocalAudioUrl(e.target.value)}
              className="w-full min-h-11 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="flex-alarm-sound"
              className="flex justify-between text-sm font-medium text-white/70"
            >
              <span>Alarm Sound</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                id="flex-alarm-sound"
                value={localAlarmSound}
                onChange={(e) => setLocalAlarmSound(e.target.value)}
                className="flex-1 min-h-11 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {Object.entries(ALARM_LABELS).map(([id, label]) => (
                  <option key={id} value={id} className="bg-[#1a1a1a]">
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePlayPreview}
                disabled={isPreviewing}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-colors text-white ${
                  isPreviewing
                    ? 'bg-white/5 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title="Preview Sound"
                aria-label="Preview alarm sound"
              >
                {isPreviewing ? (
                  <Square size={18} className="fill-current animate-pulse" />
                ) : (
                  <Play size={18} className="fill-current" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
