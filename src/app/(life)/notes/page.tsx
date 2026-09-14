import PageShell from '@/components/ui/PageShell';
import FilesBoard from '@/components/notes/FilesBoard';

export default function NotesPage() {
  return (
    <PageShell
      title="Notes"
      subtitle="Your files and folders"
      accent="notes"
      width="wide"
    >
      <FilesBoard />
    </PageShell>
  );
}
