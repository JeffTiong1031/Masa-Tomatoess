'use client';

import AppShell from '@/components/AppShell';
import Gatekeeper from '@/components/Gatekeeper';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Gatekeeper>
      <AppShell>{children}</AppShell>
    </Gatekeeper>
  );
}
