'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AssistantSheet from './AssistantSheet';
import type { ApplyTone } from '@/lib/applyRun';
import type { UserName } from '@/lib/identity';
import type { AssistantClock, AssistantSection } from './section';

export default function AssistantButton<C extends { handle: string }, R>({
  section,
  owner,
  rows,
  clock,
  onApplied,
}: {
  section: AssistantSection<C, R>;
  owner: UserName;
  rows: R[];
  clock: () => AssistantClock;
  onApplied: (message: string, tone: ApplyTone) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={section.title}
        className="mt-assistant-fab fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mt-accent)] text-[var(--mt-text)] shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
      >
        <Sparkles size={22} aria-hidden />
      </button>
      <AssistantSheet
        open={open}
        onClose={() => setOpen(false)}
        section={section}
        owner={owner}
        rows={rows}
        clock={clock}
        onApplied={onApplied}
      />
    </>
  );
}
