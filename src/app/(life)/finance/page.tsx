import PageShell from '@/components/ui/PageShell';
import FinanceBoard from '@/components/finance/FinanceBoard';

export default function FinancePage() {
  return (
    <PageShell title="Finance" subtitle="Where the money went" accent="finance">
      <FinanceBoard />
    </PageShell>
  );
}
