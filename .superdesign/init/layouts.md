# Shared Layouts

## RootLayout

- Source: `src/app/layout.tsx`
- Description: Next.js App Router root layout. Loads Geist font variables, global CSS, metadata, and wraps every route in `ClientProviders`.

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Masa Tomato",
  description: "A premium Pomodoro productivity OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
```

## ClientProviders

- Source: `src/components/ClientProviders.tsx`
- Description: Client boundary that gates the application behind identity selection and then applies the global application shell.

```tsx
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
```

## AppShell

- Source: `src/components/AppShell.tsx`
- Description: Full-screen shared shell for every route. Establishes the zinc-950 canvas, background layer, global navigation, timer engine, theme modal, embedded audio player, and alarm player.

```tsx
'use client';

import AppNav from '@/components/AppNav';
import BackgroundManager from '@/components/BackgroundManager';
import ThemeModal from '@/components/ThemeModal';
import AudioPlayer from '@/components/AudioPlayer';
import AlarmPlayer from '@/components/AlarmPlayer';
import TimerEngine from '@/components/TimerEngine';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950">
      <BackgroundManager />
      <AppNav />
      <TimerEngine />
      {children}
      <ThemeModal />
      <AudioPlayer />
      <AlarmPlayer />
    </div>
  );
}
```

## AppNav

- Source: `src/components/AppNav.tsx`
- Description: Shared floating top-center pill navigation with path-aware active state for Timer, Flexible, and Dashboard. Approved redesign direction moves this navigation to a phone bottom bar on compact screens.

```tsx
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
```

## BackgroundManager

- Source: `src/components/BackgroundManager.tsx`
- Description: Global visual background layer. Reads theme state from Zustand, loads the custom image file from IndexedDB, creates an object URL, and adds a dark readability overlay.

```tsx
'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useState } from 'react';
import { get } from 'idb-keyval';

export default function BackgroundManager() {
  const { settings } = useTimerStore();
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  const loadCustomTheme = async () => {
    try {
      const file = await get<File>('custom-theme-file');
      if (file) {
        const url = URL.createObjectURL(file);
        setCustomUrl(url);
      }
    } catch (err) {
      console.error('Failed to load custom theme from IndexedDB:', err);
    }
  };

  useEffect(() => {
    if (settings.themeId === 'custom') {
      loadCustomTheme();
    }

    // Listen for custom theme updates from ThemeModal
    const handleUpdate = () => {
      if (settings.themeId === 'custom') {
        loadCustomTheme();
      }
    };
    
    window.addEventListener('custom-theme-updated', handleUpdate);
    return () => {
      window.removeEventListener('custom-theme-updated', handleUpdate);
      if (customUrl) {
        URL.revokeObjectURL(customUrl); // cleanup
      }
    };
  }, [settings.themeId]);

  let backgroundStyle: React.CSSProperties = {};

  if (settings.themeId === 'none') {
    // Default gradient is handled by CSS classes on the div
  } else if (settings.themeId === 'custom' && customUrl) {
    backgroundStyle = { backgroundImage: `url(${customUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  } else if (settings.themeId !== 'custom' && settings.themeId !== 'none') {
    backgroundStyle = { backgroundImage: `url(${settings.themeId})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }

  return (
    <div 
      className={`absolute inset-0 z-0 transition-all duration-1000 ease-in-out ${settings.themeId === 'none' ? 'bg-gradient-to-br from-blue-900/20 via-zinc-950 to-purple-900/20' : 'bg-black/50'}`}
      style={backgroundStyle}
    >
      {/* If an image is set, add a dark overlay for readability */}
      {settings.themeId !== 'none' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      )}
    </div>
  );
}
```

## Shared shell composition

```text
src/app/layout.tsx
└─ ClientProviders
   └─ Gatekeeper
      └─ AppShell
         ├─ BackgroundManager
         ├─ AppNav
         ├─ TimerEngine
         ├─ route children
         ├─ ThemeModal
         ├─ AudioPlayer
         └─ AlarmPlayer
```

Other globally mounted shell components, whose source belongs in each page dependency tree, are:

- `src/components/Gatekeeper.tsx`
- `src/components/ThemeModal.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/AlarmPlayer.tsx`
- `src/components/TimerEngine.tsx`
