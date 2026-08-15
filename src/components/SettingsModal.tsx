'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { Settings, Play, Square } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { playAlarmOnce, ALARM_LABELS, type AlarmSoundId } from '@/utils/alarmSounds';
import Modal from '@/components/ui/Modal';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings, strictMode, toggleStrictMode } = useTimerStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const mounted = useHasMounted();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  if (!mounted) return null;

  const openModal = () => {
    setLocalSettings(settings);
    setIsOpen(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setIsOpen(false);
  };

  const handlePlayPreview = () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    playAlarmOnce(localSettings.alarmSound as AlarmSoundId);
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
        aria-label="Open timer settings"
      >
        <Settings size={22} />
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Timer Settings"
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
              <span>Focus Time (minutes)</span>
              <input
                type="number"
                min="5"
                step="5"
                value={localSettings.focusTime}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    focusTime: parseInt(e.target.value) || 5,
                  })
                }
                onBlur={(e) => {
                  const val =
                    Math.max(5, Math.round(parseInt(e.target.value) / 5) * 5) || 5;
                  setLocalSettings({ ...localSettings, focusTime: val });
                }}
                className="w-16 min-h-10 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded px-2 py-1 text-right text-[var(--mt-text)] focus:outline-none focus:border-[var(--mt-focus)]"
              />
            </label>
            <input
              type="range"
              min="5"
              max="90"
              step="5"
              value={localSettings.focusTime}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  focusTime: parseInt(e.target.value),
                })
              }
              className="w-full accent-[var(--mt-accent)]"
              aria-label="Focus time"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-[var(--mt-text)] gap-3">
              <span>Short Break (minutes)</span>
              <input
                type="number"
                min="5"
                step="5"
                value={localSettings.shortBreak}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    shortBreak: parseInt(e.target.value) || 5,
                  })
                }
                onBlur={(e) => {
                  const val =
                    Math.max(5, Math.round(parseInt(e.target.value) / 5) * 5) || 5;
                  setLocalSettings({ ...localSettings, shortBreak: val });
                }}
                className="w-16 min-h-10 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded px-2 py-1 text-right text-[var(--mt-text)] focus:outline-none focus:border-[var(--mt-focus)]"
              />
            </label>
            <input
              type="range"
              min="5"
              max="15"
              step="5"
              value={localSettings.shortBreak}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  shortBreak: parseInt(e.target.value),
                })
              }
              className="w-full accent-[var(--mt-accent)]"
              aria-label="Short break"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-[var(--mt-text)] gap-3">
              <span>Long Break (minutes)</span>
              <input
                type="number"
                min="5"
                step="5"
                value={localSettings.longBreak}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    longBreak: parseInt(e.target.value) || 5,
                  })
                }
                onBlur={(e) => {
                  const val =
                    Math.max(5, Math.round(parseInt(e.target.value) / 5) * 5) || 5;
                  setLocalSettings({ ...localSettings, longBreak: val });
                }}
                className="w-16 min-h-10 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded px-2 py-1 text-right text-[var(--mt-text)] focus:outline-none focus:border-[var(--mt-focus)]"
              />
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={localSettings.longBreak}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  longBreak: parseInt(e.target.value),
                })
              }
              className="w-full accent-[var(--mt-accent)]"
              aria-label="Long break"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-[var(--mt-text)] gap-3">
              <span>Long Break Interval</span>
              <input
                type="number"
                min="2"
                max="10"
                step="1"
                value={localSettings.cycleCount}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    cycleCount: parseInt(e.target.value) || 2,
                  })
                }
                onBlur={(e) => {
                  const val = Math.max(2, parseInt(e.target.value) || 2);
                  setLocalSettings({ ...localSettings, cycleCount: val });
                }}
                className="w-16 min-h-10 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded px-2 py-1 text-right text-[var(--mt-text)] focus:outline-none focus:border-[var(--mt-focus)]"
              />
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={localSettings.cycleCount}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  cycleCount: parseInt(e.target.value),
                })
              }
              className="w-full accent-[var(--mt-accent)]"
              aria-label="Long break interval"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="audio-url"
              className="flex justify-between text-sm font-medium text-[var(--mt-text)]"
            >
              <span>Background Audio (Spotify/YouTube URL)</span>
            </label>
            <input
              id="audio-url"
              type="text"
              placeholder="Paste URL here..."
              value={localSettings.audioUrl || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, audioUrl: e.target.value })
              }
              className="w-full min-h-11 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded-lg px-4 py-2 text-sm text-[var(--mt-text)] placeholder:text-[var(--mt-text-subtle)] focus:outline-none focus:border-[var(--mt-focus)] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="alarm-sound"
              className="flex justify-between text-sm font-medium text-[var(--mt-text)]"
            >
              <span>Alarm Sound</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                id="alarm-sound"
                value={localSettings.alarmSound}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    alarmSound: e.target.value,
                  })
                }
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

          <div className="flex items-center justify-between pt-4 border-t border-[var(--mt-border)] gap-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--mt-text)]">Strict Mode</h3>
              <p className="text-xs text-[var(--mt-text-muted)] mt-1">
                Pausing a focus session ruins it
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={strictMode}
              onClick={toggleStrictMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mt-focus)] ${
                strictMode ? 'bg-[var(--mt-danger)]' : 'bg-[var(--mt-border)]'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                  strictMode
                    ? 'bg-[var(--mt-surface)] translate-x-6'
                    : 'bg-[var(--mt-text)] translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
