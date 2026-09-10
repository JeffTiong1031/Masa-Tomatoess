import PageShell from '@/components/ui/PageShell';
import TodoBoard from '@/components/todo/TodoBoard';

export default function TodoPage() {
  return (
    <PageShell title="To-do" subtitle="What's due" accent="todo">
      <TodoBoard />
    </PageShell>
  );
}
