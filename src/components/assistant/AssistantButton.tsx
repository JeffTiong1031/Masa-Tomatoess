'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AssistantSheet from './AssistantSheet';
import type { Todo } from '@/lib/todo';
import type { UserName } from '@/lib/identity';

export default function AssistantButton({
  owner,
  rows,
  today,
  now,
  onApplied,
}: {
  owner: UserName;
  rows: Todo[];
  today: string;
  now: string;
  onApplied: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask about your list"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mt-accent)] text-[var(--mt-text)] shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
      >
        <Sparkles size={22} aria-hidden />
      </button>
      <AssistantSheet
        open={open}
        onClose={() => setOpen(false)}
        owner={owner}
        rows={rows}
        today={today}
        now={now}
        onApplied={onApplied}
      />
    </>
  );
}
