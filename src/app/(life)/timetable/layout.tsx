import TimetablePanel from '@/components/nav/TimetablePanel';

export default function TimetableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-section="timetable"
      className="flex flex-1 flex-col"
    >
      {children}
      <TimetablePanel />
    </div>
  );
}
