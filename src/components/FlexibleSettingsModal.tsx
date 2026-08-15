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
      {/* fixed, not absolute: the offsets below are written in viewport /
          safe-area terms, so they only land level with the drawer's
          hamburger (also fixed) if the viewport is the containing block.
          Under `absolute` the containing block was <main>, which the Focus
          pill pushes 122px down the page. */}
      <button
        type="button"
        onClick={openModal}
        className="fixed z-40 min-h-11 min-w-11 inline-flex items-center justify-center text-[var(--mt-text-muted)] hover:text-[var(--mt-text)] bg-[var(--mt-glass)] hover:bg-[var(--mt-glass-strong)] rounded-full backdrop-blur-sm transition-all border border-[var(--mt-border)]"
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
            className="w-full min-h-12 py-3 bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)] font-medium rounded-xl hover:opacity-90 transition-colors"
          >
            Save Changes
          </button>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-[var(--mt-text)] gap-3">
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
                className="w-16 min-h-10 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded px-2 py-1 text-right text-[var(--mt-text)] focus:outline-none focus:border-[var(--mt-focus)]"
              />
            </label>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={clampRestRatio(localRatio)}
              onChange={(e) => setLocalRatio(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--mt-accent)]"
              aria-label="Rest ratio"
            />
            <p className="text-xs text-[var(--mt-text-muted)]">
              Example: 30 min study → {exampleRestMin} min rest
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="flex-audio-url"
              className="flex justify-between text-sm font-medium text-[var(--mt-text)]"
            >
              <span>Background Audio (Spotify/YouTube URL)</span>
            </label>
            <input
              id="flex-audio-url"
              type="text"
              placeholder="Paste URL here..."
              value={localAudioUrl || ''}
              onChange={(e) => setLocalAudioUrl(e.target.value)}
              className="w-full min-h-11 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded-lg px-4 py-2 text-sm text-[var(--mt-text)] placeholder:text-[var(--mt-text-subtle)] focus:outline-none focus:border-[var(--mt-focus)] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="flex-alarm-sound"
              className="flex justify-between text-sm font-medium text-[var(--mt-text)]"
            >
              <span>Alarm Sound</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                id="flex-alarm-sound"
                value={localAlarmSound}
                onChange={(e) => setLocalAlarmSound(e.target.value)}
                className="flex-1 min-h-11 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded-lg px-4 py-2 text-sm text-[var(--mt-text)] focus:outline-none focus:border-[var(--mt-focus)] transition-colors"
              >
                {Object.entries(ALARM_LABELS).map(([id, label]) => (
                  <option key={id} value={id} className="bg-[var(--mt-surface)]">
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePlayPreview}
                disabled={isPreviewing}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-colors text-[var(--mt-text)] ${
                  isPreviewing
                    ? 'bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] cursor-not-allowed'
                    : 'bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--mt-text)_12%,transparent)]'
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
