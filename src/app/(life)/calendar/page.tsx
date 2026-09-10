import PageShell from '@/components/ui/PageShell';
import CalendarBoard from '@/components/calendar/CalendarBoard';

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      subtitle="What's happening, and when"
      accent="calendar"
    >
      <CalendarBoard />
    </PageShell>
  );
}
