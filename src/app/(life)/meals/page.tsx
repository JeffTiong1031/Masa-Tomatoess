import PageShell from '@/components/ui/PageShell';
import MealsBoard from '@/components/meals/MealsBoard';

export default function MealsPage() {
  return (
    <PageShell title="Meals" subtitle="What we ate" accent="meals">
      <MealsBoard />
    </PageShell>
  );
}
