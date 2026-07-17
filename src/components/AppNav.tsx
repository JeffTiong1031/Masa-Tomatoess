'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Timer, Clock3, LayoutDashboard } from 'lucide-react';
import { useIsMdUp } from '@/hooks/useMediaQuery';

const LINKS = [
  { href: '/', label: 'Timer', icon: Timer },
  { href: '/flexible', label: 'Flexible', icon: Clock3 },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const isMdUp = useIsMdUp();

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`);

  if (isMdUp) {
    return (
      <nav
        aria-label="Primary"
        className="absolute z-50 flex items-center gap-1.5 rounded-full border border-blue-300/10 bg-[#10182d]/90 p-1.5 shadow-[0_14px_40px_rgba(2,6,23,0.35)] backdrop-blur-xl"
        style={{
          top: 'calc(var(--mt-safe-top) + 1.25rem)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-sm transition-all duration-200 ${
                active
                  ? 'bg-white font-semibold text-slate-950 shadow-[0_4px_14px_rgba(255,255,255,0.16)]'
                  : 'text-slate-300/70 hover:bg-white/[0.07] hover:text-white'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[var(--mt-glass-strong)] backdrop-blur-xl"
      style={{ paddingBottom: 'var(--mt-safe-bottom)' }}
    >
      <div className="grid grid-cols-3 max-w-lg mx-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 min-h-[var(--mt-nav-height)] text-[11px] font-medium transition-colors ${
                active ? 'text-white' : 'text-white/45'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={22}
                className={active ? 'text-[var(--mt-accent)]' : undefined}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
