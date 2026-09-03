import PageShell from '@/components/ui/PageShell';
import TimetableBoard from '@/components/timetable/TimetableBoard';
import TimelineBoard from '@/components/timeline/TimelineBoard';

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="Your week, and what you're actually doing"
      accent="timetable"
    >
      <TimetableBoard />
      <TimelineBoard />
    </PageShell>
  );
}
