import type { CalendarEvent } from '@/lib/calendarEvent';
import { swatchToken, type Category } from '@/lib/categories';

function timeLabel(event: CalendarEvent): string {
  if (event.timing.kind === 'allDay') return 'All day';
  if (event.timing.kind === 'moment') return event.timing.startTime;
  return `${event.timing.startTime} – ${event.timing.endTime}`;
}

export default function EventBlock({
  event,
  category,
  isOwn,
  onOpen,
}: {
  event: CalendarEvent;
  category: Category | null;
  isOwn: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const description = `${event.title}, ${timeLabel(event)}${
    isOwn ? '' : `, ${event.owner}’s`
  }`;

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={description}
      className="flex min-h-11 w-full flex-col items-start justify-center rounded-xl px-3 py-2 text-left"
      style={{
        background: isOwn
          ? 'color-mix(in srgb, var(--mt-accent) 32%, var(--mt-surface))'
          : 'var(--mt-surface)',
        border: isOwn ? 'none' : '1.5px solid var(--mt-accent-deep)',
      }}
    >
      <span className="flex items-center gap-2">
        {category && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: `var(${swatchToken(category.swatch)})` }}
            aria-hidden
          />
        )}
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {event.title}
        </span>
      </span>
      <span className="mt-0.5 text-xs text-[var(--mt-text-muted)]">
        {timeLabel(event)}
      </span>
    </button>
  );
}
