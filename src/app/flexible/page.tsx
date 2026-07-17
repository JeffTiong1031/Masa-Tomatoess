import FlexibleDisplay from '@/components/FlexibleDisplay';
import FlexibleControls from '@/components/FlexibleControls';
import FlexibleSettingsModal from '@/components/FlexibleSettingsModal';

export default function FlexiblePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center transition-colors duration-1000 relative overflow-hidden">
      <div className="z-10 flex flex-col items-center">
        <FlexibleDisplay />
        <FlexibleControls />
      </div>
      <FlexibleSettingsModal />
    </main>
  );
}
