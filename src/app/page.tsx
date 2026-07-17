import TimerDisplay from '@/components/TimerDisplay';
import Controls from '@/components/Controls';
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center mt-page-pad relative">
      <div className="z-10 flex flex-col items-center w-full">
        <TimerDisplay />
        <Controls />
      </div>
      <SettingsModal />
    </main>
  );
}
