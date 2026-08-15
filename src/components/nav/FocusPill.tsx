'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { accentVar } from '@/components/ui/PageShell';
import { FOCUS_SEGMENTS, isFocusRoute } from './navLinks';

export default function FocusPill() {
  const pathname = usePathname();

  /* Study's other two routes -- Calendar and Timeline -- sit inside the
     section but outside Focus, and get no pill. They are PageShell
     pages, which carry their own hamburger clearance via .mt-page-pad;
     .mt-page-pad-focus deliberately does not, because it assumes this
     pill is rendering above it. Returning null here is therefore only
     safe for routes NOT using .mt-page-pad-focus. */
  if (!isFocusRoute(pathname)) return null;

  return (
    <nav
      aria-label="Focus sections"
      className="mx-auto w-full max-w-3xl"
      style={{
        // Clears the fixed hamburger (top: safe-top + 1rem, 2.75rem tall)
        // for the whole Focus group; .mt-page-pad-focus deliberately does
        // not repeat it.
        paddingTop: 'calc(var(--mt-safe-top) + 4.25rem)',
        // Same horizontal rule as .mt-page-pad -- a plain px-4 lets the end
        // segments slide under the cutout in landscape on a notched phone.
        paddingLeft: 'max(1rem, var(--mt-safe-left))',
        paddingRight: 'max(1rem, var(--mt-safe-right))',
      }}
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
