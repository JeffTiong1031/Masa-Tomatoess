'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function TimerDisplay() {
  const {
    timeLeft,
    mode,
    settings,
    currentCycle,
    taskName,
    tagColor,
    showStrictWarning,
    clearStrictWarning,
    setTaskDetails,
    customColors,
    addCustomColor,
    updateCustomColor,
    clearCustomColors,
  } = useTimerStore();
  const mounted = useHasMounted();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showStrictWarning) {
      const timer = setTimeout(() => clearStrictWarning(), 3000);
      return () => clearTimeout(timer);
    }
  }, [showStrictWarning, clearStrictWarning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'focus':
        return 'Focus Session';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  let totalSeconds = settings.focusTime * 60;
  if (mode === 'shortBreak') totalSeconds = settings.shortBreak * 60;
  else if (mode === 'longBreak') totalSeconds = settings.longBreak * 60;

  const progress = mounted ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!mounted) {
    return (
      <div className="w-[min(86vw,22rem)] aspect-square rounded-[var(--mt-radius-card)] mt-glass animate-pulse" />
    );
  }

  return (
    <div className="relative flex flex-col items-center w-full max-w-[22rem] px-1">
      {showStrictWarning && (
        <div
          role="status"
          className="absolute -top-14 left-1/2 -translate-x-1/2 max-w-[min(92vw,20rem)] bg-red-500/90 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-2xl z-50 text-sm font-medium border border-white/20 text-center"
        >
          Focus session broken!
        </div>
      )}

      <div
        className="flex items-center gap-3 mb-5 w-full mt-glass p-2 rounded-full shadow-lg relative z-40"
        ref={colorPickerRef}
      >
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="min-h-11 min-w-11 rounded-full border border-white/20 cursor-pointer flex-shrink-0 transition-transform hover:scale-105"
          style={{ backgroundColor: tagColor }}
          title="Choose a tag color"
          aria-label="Choose task tag color"
          aria-expanded={showColorPicker}
        />

        {showColorPicker && (
          <div className="absolute top-14 left-0 bg-[var(--mt-surface)] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-[min(92vw,14rem)]">
            <div className="grid grid-cols-5 gap-2">
              {[
                '#ef4444',
                '#f97316',
                '#eab308',
                '#22c55e',
                '#3b82f6',
                '#a855f7',
                '#ec4899',
                '#78350f',
                '#000000',
                '#ffffff',
              ].map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => {
                    setTaskDetails(taskName, color);
                    setShowColorPicker(false);
                  }}
                  className={`min-h-9 min-w-9 rounded-full border-2 transition-transform hover:scale-110 ${
                    tagColor === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="text-[10px] font-bold text-white/50 tracking-wider">
                  CUSTOM (MAX 4)
                </div>
                {customColors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearCustomColors()}
                    className="text-[10px] font-medium text-red-400/70 hover:text-red-400 min-h-8 px-1"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {customColors.length < 4 && (
                  <label
                    className="flex items-center justify-center min-h-9 min-w-9 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                    title="Add Custom Color"
                  >
                    <Plus size={14} className="text-white" aria-hidden />
                    <span className="sr-only">Add custom color</span>
                    <input
                      type="color"
                      value={tagColor}
                      onChange={(e) => {
                        setTaskDetails(taskName, e.target.value);
                        addCustomColor(e.target.value);
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                {customColors.map((color, index) => (
                  <label
                    key={`${index}-${color}`}
                    onClick={() => setTaskDetails(taskName, color)}
                    className={`flex items-center justify-center min-h-9 min-w-9 rounded-full border cursor-pointer ${
                      tagColor === color
                        ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title="Click to select, open to edit"
                  >
                    <span className="sr-only">Edit custom color {index + 1}</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        setTaskDetails(taskName, e.target.value);
                        updateCustomColor(index, e.target.value);
                      }}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <label className="sr-only" htmlFor="task-name-input">
          What are you working on?
        </label>
        <input
          id="task-name-input"
          type="text"
          placeholder="What are you working on?"
          value={taskName}
          onChange={(e) => setTaskDetails(e.target.value, tagColor)}
          className="flex-1 min-h-11 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/40 font-medium tracking-wide pr-3"
        />
      </div>

      <div className="relative flex flex-col items-center justify-center w-full aspect-square max-w-[22rem] mt-glass rounded-[var(--mt-radius-card)] shadow-[0_32px_64px_rgba(0,0,0,0.45)]">
        <svg
          className="absolute inset-[8%] w-[84%] h-[84%] transform -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="text-white/5 stroke-current"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="text-blue-500 stroke-current transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
            strokeWidth="6"
            strokeLinecap="round"
            fill="transparent"
            style={{ strokeDasharray: circumference, strokeDashoffset }}
          />
        </svg>

        <div className="text-center z-10 flex flex-col items-center px-4">
          <span className="text-xs font-bold tracking-[0.25em] text-white/50 uppercase mb-2">
            {getModeLabel()}
          </span>
          <h1
            className="text-[clamp(2.75rem,16vw,5rem)] leading-none font-extralight tabular-nums tracking-tighter text-white drop-shadow-2xl"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatTime(timeLeft)}
          </h1>

          <div className="flex items-center gap-2 mt-5" aria-label={`Cycle ${currentCycle} of ${settings.cycleCount}`}>
            {Array.from({ length: settings.cycleCount }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-500 shadow-sm ${
                  i < currentCycle
                    ? 'bg-white scale-110 shadow-white/50'
                    : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
