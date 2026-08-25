'use client';

import NavDrawer from '@/components/nav/NavDrawer';
import BackgroundManager from '@/components/BackgroundManager';
import AudioPlayer from '@/components/AudioPlayer';
import AlarmPlayer from '@/components/AlarmPlayer';
import TimerEngine from '@/components/TimerEngine';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <BackgroundManager />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <NavDrawer />
        {/* TimerEngine stays here, above the route groups, so a running
            timer survives navigation between sections. Do not move it. */}
        <TimerEngine />
        <div className="flex flex-1 flex-col">{children}</div>
        <AudioPlayer />
        <AlarmPlayer />
      </div>
    </div>
  );
}
