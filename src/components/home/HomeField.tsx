import { accentVar } from '@/components/ui/PageShell';
import { HOME_BLOBS, HOME_DOTS, HOME_RINGS } from '@/lib/homeField';

export default function HomeField() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(var(--mt-border) 1px, transparent 1px), linear-gradient(90deg, var(--mt-border) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      {HOME_BLOBS.map((blob) => (
        <div
          key={`blob-${blob.accent}-${blob.top}-${blob.left}`}
          className="absolute rounded-full blur-[80px]"
          style={{
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            opacity: blob.opacity,
            background: accentVar(blob.accent),
            mixBlendMode: 'multiply',
          }}
        />
      ))}
      {HOME_RINGS.map((ring) => (
        <div
          key={`ring-${ring.accent}-${ring.top}-${ring.left}`}
          className="absolute rounded-full border-2"
          style={{
            top: ring.top,
            left: ring.left,
            width: ring.size,
            height: ring.size,
            opacity: ring.opacity,
            borderColor: accentVar(ring.accent),
          }}
        />
      ))}
      {HOME_DOTS.map((dot) => (
        <div
          key={`dot-${dot.accent}-${dot.top}-${dot.left}`}
          className="absolute rounded-full"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            background: accentVar(dot.accent),
          }}
        />
      ))}
    </div>
  );
}
