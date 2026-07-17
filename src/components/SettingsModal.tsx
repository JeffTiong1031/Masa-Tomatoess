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
      <button
        type="button"
        onClick={openModal}
        className="absolute z-40 min-h-11 min-w-11 inline-flex items-center justify-center text-white/50 hover:text-white bg-black/25 hover:bg-black/45 rounded-full backdrop-blur-sm transition-all border border-white/10"
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
            className="w-full min-h-12 py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors"
          >
            Save Changes
          </button>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-white/70 gap-3">
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
                className="w-16 min-h-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
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
              className="w-full accent-blue-500"
              aria-label="Focus time"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-white/70 gap-3">
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
                className="w-16 min-h-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-green-500"
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
              className="w-full accent-green-500"
              aria-label="Short break"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-white/70 gap-3">
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
                className="w-16 min-h-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-purple-500"
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
              className="w-full accent-purple-500"
              aria-label="Long break"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-white/70 gap-3">
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
                className="w-16 min-h-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-yellow-500"
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
              className="w-full accent-yellow-500"
              aria-label="Long break interval"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="audio-url"
              className="flex justify-between text-sm font-medium text-white/70"
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
              className="w-full min-h-11 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="alarm-sound"
              className="flex justify-between text-sm font-medium text-white/70"
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

          <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-4">
            <div>
              <h3 className="text-sm font-medium text-white/90">Strict Mode</h3>
              <p className="text-xs text-white/50 mt-1">
                Pausing a focus session ruins it
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={strictMode}
              onClick={toggleStrictMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                strictMode ? 'bg-red-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  strictMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
