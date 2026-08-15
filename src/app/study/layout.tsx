import type { Viewport } from 'next';
import FocusPill from '@/components/nav/FocusPill';
import StudyPanel from '@/components/nav/StudyPanel';

export const viewport: Viewport = {
  themeColor: '#FDF8F3',
};

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* data-section drives the one padding rule Study needs that the rest
       of the app does not: StudyPanel is fixed to the bottom edge at
       EVERY width, where AppNav hides above 768px, so these pages have
       to keep reserving nav height on desktop. See .mt-page-pad in
       globals.css. */
    <div
      data-mood="light"
      data-section="study"
      className="flex flex-1 flex-col text-[var(--mt-text)]"
    >
      <FocusPill />
      {children}
      <StudyPanel />
    </div>
  );
}
