'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useState, useRef } from 'react';
import { Plus } from 'lucide-react';

export default function TimerDisplay() {
  const { 
    timeLeft, mode, settings, currentCycle, 
    taskName, tagColor, showStrictWarning, 
    clearStrictWarning, setTaskDetails,
    customColors, addCustomColor, updateCustomColor, clearCustomColors
  } = useTimerStore();
  const [mounted, setMounted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Avoid hydration errors with zustand persist
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showStrictWarning) {
      const timer = setTimeout(() => {
        clearStrictWarning();
      }, 3000);
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

  // Calculate progress for the circular ring
  let totalSeconds = settings.focusTime * 60;
  if (mode === 'shortBreak') totalSeconds = settings.shortBreak * 60;
  else if (mode === 'longBreak') totalSeconds = settings.longBreak * 60;

  const progress = mounted ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!mounted) {
    return <div className="h-[360px] w-[360px] flex items-center justify-center text-2xl font-light text-white/50 animate-pulse">Loading...</div>;
  }

  return (
    <div className="relative flex flex-col items-center">
      {showStrictWarning && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-4 duration-300 font-medium border border-white/20">
          ⚠️ Focus session broken!
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 w-full max-w-[360px] bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg relative z-50" ref={colorPickerRef}>
        
        {/* Custom Color Trigger Button */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-8 h-8 rounded-full border border-white/20 cursor-pointer flex-shrink-0 transition-transform hover:scale-105"
          style={{ backgroundColor: tagColor }}
          title="Choose a tag color"
        />

        {/* Popover Color Picker */}
        {showColorPicker && (
          <div className="absolute top-12 left-0 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-[200px] animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-5 gap-2">
              {[
                '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
                '#a855f7', '#ec4899', '#78350f', '#000000', '#ffffff'
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setTaskDetails(taskName, color);
                    setShowColorPicker(false);
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    tagColor === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-white/50 tracking-wider">CUSTOM COLORS (MAX 4)</div>
                {customColors.length > 0 && (
                  <button
                    onClick={() => clearCustomColors()}
                    className="text-[10px] font-medium text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                
                {customColors.length < 4 && (
                  <label className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer transition-colors flex-shrink-0" title="Add Custom Color">
                    <Plus size={14} className="text-white" />
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

                {customColors.length > 0 && customColors.length < 4 && (
                  <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0"></div>
                )}

                {customColors.map((color, index) => (
                  <label
                    key={`${index}-${color}`}
                    onClick={() => setTaskDetails(taskName, color)}
                    className={`flex items-center justify-center w-7 h-7 rounded-full border cursor-pointer transition-transform hover:scale-110 flex-shrink-0 ${
                      tagColor === color ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title="Click to select, open to edit"
                  >
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

        <input
          type="text"
          placeholder="What are you working on?"
          value={taskName}
          onChange={(e) => setTaskDetails(e.target.value, tagColor)}
          className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/40 font-medium tracking-wide pr-4"
        />
      </div>

      <div className="relative flex flex-col items-center justify-center w-[360px] h-[360px] bg-black/30 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
        {/* Circular Progress */}
      <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
        <circle
          cx="180"
          cy="180"
          r={radius}
          className="text-white/5 stroke-current"
          strokeWidth="12"
          fill="transparent"
        />
        <circle
          cx="180"
          cy="180"
          r={radius}
          className="text-blue-500 stroke-current transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
          strokeWidth="12"
          strokeLinecap="round"
          fill="transparent"
          style={{ strokeDasharray: circumference, strokeDashoffset }}
        />
      </svg>

      {/* Timer Text */}
      <div className="text-center z-10 flex flex-col items-center mt-2">
        <span className="text-xs font-bold tracking-[0.25em] text-white/50 uppercase mb-3">
          {getModeLabel()}
        </span>
        <h1 className="text-[5.5rem] leading-none font-extralight tabular-nums tracking-tighter text-white drop-shadow-2xl">
          {formatTime(timeLeft)}
        </h1>
        
        {/* Cycle Track */}
        <div className="flex items-center gap-2 mt-6">
          {Array.from({ length: settings.cycleCount }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 shadow-sm ${
                i < currentCycle ? 'bg-white scale-110 shadow-white/50' : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
