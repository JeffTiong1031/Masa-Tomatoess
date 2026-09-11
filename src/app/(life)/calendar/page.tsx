import { Suspense } from 'react';
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import CalendarBoard from '@/components/calendar/CalendarBoard';

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      subtitle="What's happening, and when"
      accent="calendar"
    >
      <Suspense
        fallback={
          <Card className="mb-4">
            <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
          </Card>
        }
      >
        <CalendarBoard />
      </Suspense>
    </PageShell>
  );
}
