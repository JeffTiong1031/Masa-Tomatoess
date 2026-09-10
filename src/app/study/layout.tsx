import type { Viewport } from 'next';
import FocusPill from '@/components/nav/FocusPill';

export const viewport: Viewport = {
  themeColor: '#FDF8F3',
};

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-mood="light"
      className="flex flex-1 flex-col text-[var(--mt-text)]"
    >
      <FocusPill />
      {children}
    </div>
  );
}
