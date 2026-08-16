import PageShell from '@/components/ui/PageShell';
import CycleBoard from '@/components/cycle/CycleBoard';

export default function CyclePage() {
  return (
    <PageShell
      title="Period"
      subtitle="Cycle tracking, shared between both of us"
      accent="cycle"
    >
      <CycleBoard />
    </PageShell>
  );
}
