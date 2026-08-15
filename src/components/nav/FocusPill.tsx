'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { accentVar } from '@/components/ui/PageShell';
import { FOCUS_SEGMENTS } from './navLinks';

export default function FocusPill() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Focus sections"
      className="mx-auto w-full max-w-3xl px-4"
      style={{ paddingTop: 'calc(var(--mt-safe-top) + 4.25rem)' }}
    >
      <div className="flex gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {FOCUS_SEGMENTS.map(({ href, label, accent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
                active ? '' : 'text-[var(--mt-text-muted)]'
              }`}
              style={
                active
                  ? {
                      background: accentVar(accent),
                      color: 'var(--mt-accent-contrast)',
                    }
                  : undefined
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
