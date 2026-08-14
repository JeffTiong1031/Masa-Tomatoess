import FlexibleDisplay from '@/components/FlexibleDisplay';
import FlexibleControls from '@/components/FlexibleControls';
import FlexibleSettingsModal from '@/components/FlexibleSettingsModal';

export default function FlexiblePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center mt-page-pad relative">
      <div className="z-10 flex flex-col items-center w-full">
        <FlexibleDisplay />
        <FlexibleControls />
      </div>
      <FlexibleSettingsModal />
    </main>
  );
}
