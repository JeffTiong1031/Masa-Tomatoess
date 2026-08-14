import type { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#FDF8F3',
};

export default function LifeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-mood="light" className="flex flex-1 flex-col text-[var(--mt-text)]">
      {children}
    </div>
  );
}
