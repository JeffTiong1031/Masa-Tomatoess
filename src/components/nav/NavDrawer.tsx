'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_GROUPS, isNavLinkActive } from './navLinks';
import { accentVar } from '@/components/ui/PageShell';

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on route change. Five of nine routes are drawer-only, so a
  // drawer left open over the destination would be a dead end. Adjusted
  // during render (React's sanctioned pattern for resetting state in
  // response to a changed value) rather than in an effect, since an
  // unconditional setState in an effect body trips
  // react-hooks/set-state-in-effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Scroll lock.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape to close, Tab cycles within the panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="fixed z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text)] shadow-[0_6px_18px_rgba(0,0,0,0.10)]"
        style={{
          top: 'calc(var(--mt-safe-top) + 1rem)',
          left: 'calc(var(--mt-safe-left) + 1rem)',
        }}
      >
        <Menu size={20} strokeWidth={1.9} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
              touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              const startY = touchStartY.current;
              touchStartX.current = null;
              touchStartY.current = null;
              if (start === null || startY === null) return;
              const dx = start - e.changedTouches[0].clientX;
              const dy = e.changedTouches[0].clientY - startY;
              if (dx > 60 && dx > Math.abs(dy)) close();
            }}
            className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col overflow-y-auto border-r border-[var(--mt-border)] bg-[var(--mt-surface)]"
            style={{
              paddingTop: 'calc(var(--mt-safe-top) + 1rem)',
              paddingBottom: 'calc(var(--mt-safe-bottom) + 1rem)',
            }}
          >
            <div className="mb-2 flex items-center justify-between px-5">
              <span className="text-sm font-semibold tracking-tight text-[var(--mt-text)]">
                Masa Tomato
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <nav className="flex-1 px-3">
              {NAV_GROUPS.map((group, i) => (
                <div key={group.title ?? `group-${i}`} className="mb-3">
                  {group.title && (
                    <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
                      {group.title}
                    </div>
                  )}
                  {group.links.map(({ href, label, icon: Icon, accent }) => {
                    const active = isNavLinkActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`mb-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                          active
                            ? 'font-semibold text-[var(--mt-text)]'
                            : 'text-[var(--mt-text-muted)]'
                        }`}
                        style={
                          active
                            ? {
                                background: `color-mix(in srgb, ${accentVar(accent)} 30%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            background: `color-mix(in srgb, ${accentVar(accent)} 45%, transparent)`,
                          }}
                        >
                          <Icon size={17} strokeWidth={1.9} aria-hidden />
                        </span>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
