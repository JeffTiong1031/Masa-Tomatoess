'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STUDY_PANEL, isActiveHref } from './navLinks';
import { accentVar } from '@/components/ui/PageShell';

/** Study's own lower panel: Focus, Calendar, Timeline.
 *
 *  Three floating pills, not a bar. The full-width slab this replaced
 *  cut a hard white band across the bottom of the wallpaper, which read
 *  as chrome bolted over the page rather than part of it. Dropping the
 *  bar background and its top border lets the photo run to the bottom
 *  edge, and the pills sit on it the same way the timer's own panels do.
 *
 *  The pills stay panelled rather than becoming bare icons, because
 *  their labels are text: on a wallpapered route nothing renders text
 *  straight onto the background, and that rule is what lets the veil
 *  stay gone.
 *
 *  Renders at every width, because the drawer does not list Calendar or
 *  Timeline and hiding this would strand them. It is the app's only
 *  bottom bar; everywhere else navigation is the drawer alone. */
export default function StudyPanel() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Study sections"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2"
      style={{ paddingBottom: 'calc(var(--mt-safe-bottom) + 0.875rem)' }}
    >
      {/* The three labelled pills measure ~340px, which fits 375 with
          room to spare but would overrun a 320px phone. The tighter
          padding below that width buys the ~40px needed rather than
          letting the row spill off screen. */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {STUDY_PANEL.map(({ href, label, icon: Icon, accent }) => {
          const active = isActiveHref(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`mt-glass flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap shadow-[0_6px_20px_rgba(0,0,0,0.12)] transition-[color,background-color,transform] duration-150 active:scale-[0.94] sm:gap-2 sm:px-4 ${
                active ? 'text-[var(--mt-accent-contrast)]' : 'text-[var(--mt-text-muted)]'
              }`}
              style={
                active
                  ? {
                      /* Solid accent, not a tint. A translucent fill
                         would let the wallpaper through and put the
                         label back on an unknown backdrop. */
                      background: accentVar(accent),
                    }
                  : undefined
              }
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
