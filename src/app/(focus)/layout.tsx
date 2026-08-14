import type { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#241C22',
};

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-mood="dark" className="flex flex-1 flex-col text-[var(--mt-text)]">
      {children}
    </div>
  );
}
