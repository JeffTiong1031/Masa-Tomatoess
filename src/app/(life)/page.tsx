import HubGrid from '@/components/HubGrid';
import InstallPrompt from '@/components/InstallPrompt';

export default function HubPage() {
  return (
    <main className="mt-page-pad flex-1">
      <div className="mx-auto w-full max-w-3xl">
        <HubGrid />
        <div className="mt-6">
          <InstallPrompt />
        </div>
      </div>
    </main>
  );
}
