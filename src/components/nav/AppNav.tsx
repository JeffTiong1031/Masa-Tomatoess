'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import {
  ALL_LINKS,
  BOTTOM_BAR_HREFS,
  isActiveHref,
  isStudyRoute,
} from './navLinks';
import { accentVar } from '@/components/ui/PageShell';

const BOTTOM_LINKS = BOTTOM_BAR_HREFS.map((href) => {
  const link = ALL_LINKS.find((l) => l.href === href);
  if (!link) throw new Error(`BOTTOM_BAR_HREFS references unknown route: ${href}`);
  return link;
});

export default function AppNav() {
  const pathname = usePathname();
  const isMdUp = useIsMdUp();

  // Inside Study, StudyPanel owns the bottom edge. Rendering both would
  // stack two fixed bars on top of each other.
  if (isStudyRoute(pathname)) return null;

  // Desktop has the drawer only; the old centre pill cannot hold every
  // destination and is retired.
  if (isMdUp) return null;

  /* Same floating-pill treatment as StudyPanel, deliberately. These two
     are the app's only bottom navigation and they are never on screen
     together, so if they looked different the difference would read as
     a bug the moment you walked from Study into Period. */
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2"
      style={{ paddingBottom: 'calc(var(--mt-safe-bottom) + 0.875rem)' }}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {BOTTOM_LINKS.map(({ href, label, icon: Icon, accent }) => {
          const active = isActiveHref(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`mt-glass flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap shadow-[0_6px_20px_rgba(0,0,0,0.12)] transition-[color,background-color,transform] duration-150 active:scale-[0.94] sm:gap-2 sm:px-4 ${
                active
                  ? 'text-[var(--mt-accent-contrast)]'
                  : 'text-[var(--mt-text-muted)]'
              }`}
              style={active ? { background: accentVar(accent) } : undefined}
            >
              <Icon size={18} strokeWidth={2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
