import HubGrid from '@/components/HubGrid';
import HomeField from '@/components/home/HomeField';
import InstallPrompt from '@/components/InstallPrompt';

export default function HubPage() {
  return (
    <main className="mt-page-pad flex-1">
      <HomeField />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <HubGrid />
        <div className="mt-6">
          <InstallPrompt />
        </div>
      </div>
    </main>
  );
}
