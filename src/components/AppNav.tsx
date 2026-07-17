'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Timer' },
  { href: '/flexible', label: 'Flexible' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
      {LINKS.map(({ href, label }) => {
        const active =
          href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              active
                ? 'bg-white text-zinc-900 font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
