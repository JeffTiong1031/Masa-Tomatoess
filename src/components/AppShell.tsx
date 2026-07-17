'use client';

import AppNav from '@/components/AppNav';
import BackgroundManager from '@/components/BackgroundManager';
import ThemeModal from '@/components/ThemeModal';
import AudioPlayer from '@/components/AudioPlayer';
import AlarmPlayer from '@/components/AlarmPlayer';
import TimerEngine from '@/components/TimerEngine';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950">
      <BackgroundManager />
      <AppNav />
      <TimerEngine />
      {children}
      <ThemeModal />
      <AudioPlayer />
      <AlarmPlayer />
    </div>
  );
}
