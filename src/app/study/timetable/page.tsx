import PageShell from '@/components/ui/PageShell';
import TimetableBoard from '@/components/timetable/TimetableBoard';

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="What we're each doing tomorrow"
      accent="timetable"
    >
      <TimetableBoard />
    </PageShell>
  );
}
