# Shared UI Components

## Component model

- Framework: Next.js 16.2.10 with React 19.2.4.
- Styling: Tailwind CSS v4 utility classes in custom components.
- Icons: Lucide React.
- Component library: none. This project does **not** have a shared `src/components/ui/` primitive layer and does not use shadcn/ui, Radix, MUI, Chakra, or a similar kit.
- Most controls, cards, inputs, and modal surfaces are implemented inline inside feature components.
- `SessionConflictDialog` is the closest existing shared dialog primitive: both classic and flexible controls use it.

## SessionConflictDialog

- Source: `src/components/SessionConflictDialog.tsx`
- Description: Shared blocking confirmation dialog shown when starting one timer mode would replace an ongoing session in the other mode.
- Props: `open: boolean`, `onConfirm: () => void`, `onCancel: () => void`

```tsx
'use client';

interface SessionConflictDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SessionConflictDialog({
  open,
  onConfirm,
  onCancel,
}: SessionConflictDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] text-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <h2 className="text-xl font-light mb-3 tracking-wide">Ongoing session</h2>
        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          You have an ongoing session. Do you wish to start a new one?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Existing inline patterns

These are patterns, not reusable primitive files:

- Modal overlay: `fixed inset-0`, `bg-black/60`, `backdrop-blur-sm`, centered with `p-4`.
- Modal panel: `bg-[#1a1a1a]`, white text, rounded corners, deep shadow.
- Primary action: white surface with dark text.
- Secondary action: translucent white glass.
- Icon action: circular, translucent black/white hover surface, Lucide icon.
- Analytics card: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`, large rounded corners and shadow.

Do not invent or assume `Button`, `Dialog`, `Card`, `Input`, or other shared primitives when generating designs. Use the actual feature components or introduce a new primitive explicitly as part of a redesign.
