import TimerDisplay from '@/components/TimerDisplay';
import Controls from '@/components/Controls';
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center transition-colors duration-1000 relative overflow-hidden">
      <div className="z-10 flex flex-col items-center">
        <TimerDisplay />
        <Controls />
      </div>
      <SettingsModal />
    </main>
  );
}
