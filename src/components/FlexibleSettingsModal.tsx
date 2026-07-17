'use client';

import { useFlexibleStore } from '@/store/useFlexibleStore';
import { useTimerStore } from '@/store/useTimerStore';
import { Settings, X, Play, Square } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { playAlarmOnce, ALARM_LABELS, type AlarmSoundId } from '@/utils/alarmSounds';
import { clampRestRatio } from '@/lib/flexibleTime';

export default function FlexibleSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { restRatio, updateRestRatio } = useFlexibleStore();
  const { settings, updateSettings } = useTimerStore();
  const [localRatio, setLocalRatio] = useState(restRatio);
  const [localAudioUrl, setLocalAudioUrl] = useState(settings.audioUrl);
  const [localAlarmSound, setLocalAlarmSound] = useState(settings.alarmSound);
  const [mounted, setMounted] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    setLocalRatio(restRatio);
    setLocalAudioUrl(settings.audioUrl);
    setLocalAlarmSound(settings.alarmSound);
  }, [restRatio, settings.audioUrl, settings.alarmSound]);

  if (!mounted) return null;

  const exampleRestMin = Math.floor(30 / clampRestRatio(localRatio));

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

            <h2 className="text-2xl font-light mb-6 tracking-wide">Flexible Settings</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-white/70">
                  <span>Rest = study ÷ N</span>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    step={1}
                    value={localRatio}
                    onChange={(e) =>
                      setLocalRatio(parseInt(e.target.value, 10) || 2)
                    }
                    onBlur={(e) =>
                      setLocalRatio(clampRestRatio(parseInt(e.target.value, 10)))
                    }
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
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
                />
                <p className="text-xs text-white/50">
                  Example: 30 min study → {exampleRestMin} min rest
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-white/70">
                  <span>Background Audio (Spotify/YouTube URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="Paste URL here..."
                  value={localAudioUrl || ''}
                  onChange={(e) => setLocalAudioUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-white/70">
                  <span>Alarm Sound</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={localAlarmSound}
                    onChange={(e) => setLocalAlarmSound(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {Object.entries(ALARM_LABELS).map(([id, label]) => (
                      <option key={id} value={id} className="bg-[#1a1a1a]">
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handlePlayPreview}
                    disabled={isPreviewing}
                    className={`p-2 rounded-lg transition-colors text-white ${
                      isPreviewing
                        ? 'bg-white/5 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title="Preview Sound"
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
