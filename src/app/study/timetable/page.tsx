import PageShell from '@/components/ui/PageShell';
import TimelineBoard from '@/components/timeline/TimelineBoard';

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="What we're each doing tomorrow"
      accent="timetable"
    >
      <TimelineBoard />
    </PageShell>
  );
}
