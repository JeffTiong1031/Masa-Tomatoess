'use client';

import AppNav from '@/components/AppNav';
import BackgroundManager from '@/components/BackgroundManager';
import ThemeModal from '@/components/ThemeModal';
import AudioPlayer from '@/components/AudioPlayer';
import AlarmPlayer from '@/components/AlarmPlayer';
import TimerEngine from '@/components/TimerEngine';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh relative bg-[var(--mt-midnight)] overflow-x-hidden">
      <BackgroundManager />
      <div className="relative z-10 min-h-dvh flex flex-col">
        <AppNav />
        <TimerEngine />
        <div className="flex-1 flex flex-col">{children}</div>
        <ThemeModal />
        <AudioPlayer />
        <AlarmPlayer />
      </div>
    </div>
  );
}
