'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import { ALL_LINKS, BOTTOM_BAR_HREFS, isActiveHref } from './navLinks';
import { accentVar } from '@/components/ui/PageShell';

const BOTTOM_LINKS = BOTTOM_BAR_HREFS.map((href) => {
  const link = ALL_LINKS.find((l) => l.href === href);
  if (!link) throw new Error(`BOTTOM_BAR_HREFS references unknown route: ${href}`);
  return link;
});

export default function AppNav() {
  const pathname = usePathname();
  const isMdUp = useIsMdUp();

  // Desktop has the drawer only; the old centre pill cannot hold nine
  // destinations and is retired.
  if (isMdUp) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--mt-border)] bg-[var(--mt-glass-strong)] backdrop-blur-xl"
      style={{ paddingBottom: 'var(--mt-safe-bottom)' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {BOTTOM_LINKS.map(({ href, label, icon: Icon, accent }) => {
          const active = isActiveHref(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[var(--mt-nav-height)] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-[var(--mt-text)]' : 'text-[var(--mt-text-muted)]'
              }`}
            >
              <Icon
                size={21}
                aria-hidden
                style={active ? { color: accentVar(accent) } : undefined}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
