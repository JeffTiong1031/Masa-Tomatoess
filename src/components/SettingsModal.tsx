'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { Settings, X, Play, Square } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { playAlarmOnce, ALARM_LABELS, type AlarmSoundId } from '@/utils/alarmSounds';

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings, strictMode, toggleStrictMode } = useTimerStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [mounted, setMounted] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    setLocalSettings(settings);
  }, [settings]);

  if (!mounted) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    setIsOpen(false);
  };

  const handlePlayPreview = () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    playAlarmOnce(localSettings.alarmSound as AlarmSoundId);
    // Reset button state after the sound plays
    previewTimeoutRef.current = setTimeout(() => setIsPreviewing(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-6 right-6 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all"
      >
        <Settings size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] text-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-light mb-6 tracking-wide">Timer Settings</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-white/70">
                  <span>Focus Time (minutes)</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={localSettings.focusTime}
                    onChange={(e) => setLocalSettings({ ...localSettings, focusTime: parseInt(e.target.value) || 5 })}
                    onBlur={(e) => {
                      const val = Math.max(5, Math.round(parseInt(e.target.value) / 5) * 5) || 5;
                      setLocalSettings({ ...localSettings, focusTime: val });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                         const val = Math.max(5, Math.round(parseInt(e.currentTarget.value) / 5) * 5) || 5;
                         setLocalSettings({ ...localSettings, focusTime: val });
                      }
                    }}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
                  />
                </label>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={localSettings.focusTime}
                  onChange={(e) => setLocalSettings({ ...localSettings, focusTime: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-white/70">
                  <span>Short Break (minutes)</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={localSettings.shortBreak}
                    onChange={(e) => setLocalSettings({ ...localSettings, shortBreak: parseInt(e.target.value) || 5 })}
                    onBlur={(e) => {
                      const val = Math.max(5, Math.round(parseInt(e.target.value) / 5) * 5) || 5;
                      setLocalSettings({ ...localSettings, shortBreak: val });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                         const val = Math.max(5, Math.round(parseInt(e.currentTarget.value) / 5) * 5) || 5;
                         setLocalSettings({ ...localSettings, shortBreak: val });
                      }
                    }}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-green-500"
                  />
                </label>
                <input
                  type="range"
                  min="5"
                  max="15"
                  step="5"
                  value={localSettings.shortBreak}
                  onChange={(e) => setLocalSettings({ ...localSettings, shortBreak: parseInt(e.target.value) })}
                  className="w-full accent-green-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-white/70">
                  <span>Long Break (minutes)</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={localSettings.longBreak}
                    onChange={(e) => setLocalSettings({ ...localSettings, longBreak: parseInt(e.target.value) || 5 })}
                    onBlur={(e) => {
                      const val = Math.max(5, Math.round(parseInt(e.target.value) / 5) * 5) || 5;
                      setLocalSettings({ ...localSettings, longBreak: val });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                         const val = Math.max(5, Math.round(parseInt(e.currentTarget.value) / 5) * 5) || 5;
                         setLocalSettings({ ...localSettings, longBreak: val });
                      }
                    }}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-purple-500"
                  />
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={localSettings.longBreak}
                  onChange={(e) => setLocalSettings({ ...localSettings, longBreak: parseInt(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-white/70">
                  <span>Long Break Interval</span>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    step="1"
                    value={localSettings.cycleCount}
                    onChange={(e) => setLocalSettings({ ...localSettings, cycleCount: parseInt(e.target.value) || 2 })}
                    onBlur={(e) => {
                      const val = Math.max(2, parseInt(e.target.value) || 2);
                      setLocalSettings({ ...localSettings, cycleCount: val });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                         const val = Math.max(2, parseInt(e.currentTarget.value) || 2);
                         setLocalSettings({ ...localSettings, cycleCount: val });
                      }
                    }}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-yellow-500"
                  />
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={localSettings.cycleCount}
                  onChange={(e) => setLocalSettings({ ...localSettings, cycleCount: parseInt(e.target.value) })}
                  className="w-full accent-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-white/70">
                  <span>Background Audio (Spotify/YouTube URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="Paste URL here..."
                  value={localSettings.audioUrl || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, audioUrl: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-white/70">
                  <span>Alarm Sound</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={localSettings.alarmSound}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, alarmSound: e.target.value });
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {Object.entries(ALARM_LABELS).map(([id, label]) => (
                      <option key={id} value={id} className="bg-[#1a1a1a]">{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handlePlayPreview}
                    disabled={isPreviewing}
                    className={`p-2 rounded-lg transition-colors text-white ${isPreviewing ? 'bg-white/5 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                    title="Preview Sound"
                  >
                    {isPreviewing ? <Square size={18} className="fill-current animate-pulse" /> : <Play size={18} className="fill-current" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <h3 className="text-sm font-medium text-white/90">Strict Mode</h3>
                  <p className="text-xs text-white/50 mt-1">Pausing a focus session ruins it</p>
                </div>
                <button
                  onClick={toggleStrictMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] ${
                    strictMode ? 'bg-red-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      strictMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="mt-8 w-full py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
