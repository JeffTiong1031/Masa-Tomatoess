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
  dense = false,
  className,
  onOpen,
}: {
  event: CalendarEvent;
  category: Category | null;
  isOwn: boolean;
  dense?: boolean;
  className?: string;
  onOpen: (event: CalendarEvent) => void;
}) {
  const description = `${event.title}, ${timeLabel(event)}${
    isOwn ? '' : `, ${event.owner}’s`
  }`;

  const shell = dense
    ? 'flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-0.5 text-left'
    : 'flex min-h-11 w-full min-w-0 flex-col items-start justify-start rounded-xl px-3 py-2 text-left';

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={description}
      className={`${shell} ${className ?? ''}`}
      style={{
        background: isOwn
          ? 'color-mix(in srgb, var(--mt-accent) 32%, var(--mt-surface))'
          : 'var(--mt-surface)',
        border: isOwn ? 'none' : '1.5px solid var(--mt-accent-deep)',
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        {category && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: `var(${swatchToken(category.swatch)})` }}
            aria-hidden
          />
        )}
        <span
          className={`truncate font-semibold text-[var(--mt-text)] ${
            dense ? 'text-xs leading-5' : 'text-sm'
          }`}
        >
          {event.title}
        </span>
      </span>
      <span
        className={`whitespace-nowrap text-[var(--mt-text-muted)] ${
          dense ? 'ml-auto shrink-0 text-xs leading-5' : 'mt-0.5 text-xs'
        }`}
      >
        {timeLabel(event)}
      </span>
    </button>
  );
}
