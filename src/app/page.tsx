import TimerDisplay from '@/components/TimerDisplay';
import Controls from '@/components/Controls';
import SettingsModal from '@/components/SettingsModal';
import AudioPlayer from '@/components/AudioPlayer';
import AlarmPlayer from '@/components/AlarmPlayer';
import ThemeModal from '@/components/ThemeModal';
import BackgroundManager from '@/components/BackgroundManager';
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 transition-colors duration-1000 relative overflow-hidden">
      <BackgroundManager />
      
      {/* Dashboard Link */}
      <Link 
        href="/dashboard"
        className="absolute top-6 left-6 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all z-50"
        title="Analytics Dashboard"
      >
        <BarChart2 size={24} />
      </Link>

      <div className="z-10 flex flex-col items-center">
        <TimerDisplay />
        <Controls />
      </div>

      <ThemeModal />
      <SettingsModal />
      <AudioPlayer />
      <AlarmPlayer />
    </main>
  );
}
