import Card from '@/components/ui/Card';

export default function FinanceSetupMissing() {
  return (
    <Card>
      <h2 className="text-base font-semibold text-[var(--mt-text)]">Not set up yet</h2>
      <p className="mt-2 text-sm text-[var(--mt-text-muted)]">
        The finance tables do not exist in the database. Run the SQL in
        docs/superpowers/specs/2026-10-02-finance-setup.sql from the Supabase SQL
        editor, then reload this page.
      </p>
    </Card>
  );
}
