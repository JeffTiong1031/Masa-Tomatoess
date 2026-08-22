'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';

export default function CameraButton({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onCapture(file);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
        aria-label="Photograph a meal"
      >
        <Camera size={22} />
      </button>
    </>
  );
}
