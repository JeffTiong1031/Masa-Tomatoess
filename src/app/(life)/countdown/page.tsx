import PageShell from '@/components/ui/PageShell';
import CountdownBoard from '@/components/countdown/CountdownBoard';

export default function CountdownPage() {
  return (
    <PageShell
      title="Countdown"
      subtitle="Dates we're counting down to"
      accent="countdown"
    >
      <CountdownBoard />
    </PageShell>
  );
}
