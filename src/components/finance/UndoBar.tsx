'use client';

export default function UndoBar({ onUndo }: { onUndo: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit items-center gap-3 rounded-full bg-[var(--mt-text)] py-1 pl-5 pr-1 text-sm text-[var(--mt-surface)] shadow-lg"
    >
      Deleted
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 rounded-full px-4 font-semibold underline underline-offset-2"
      >
        Undo
      </button>
    </div>
  );
}
