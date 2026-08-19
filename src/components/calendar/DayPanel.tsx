import type { CalendarEvent } from '@/lib/calendarEvent';
import { sortDay, timelineHours } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { formatLongDate } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import EventBlock from './EventBlock';

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function hourOf(event: CalendarEvent): number {
  if (event.timing.kind === 'allDay') return 0;
  return Number(event.timing.startTime.slice(0, 2));
}

export default function DayPanel({
  date,
  events,
  categories,
  signedInAs,
  onOpen,
}: {
  date: string;
  events: CalendarEvent[];
  categories: Category[];
  signedInAs: UserName;
  onOpen: (event: CalendarEvent) => void;
}) {
  const ordered = sortDay(events);
  const allDay = ordered.filter((event) => event.timing.kind === 'allDay');
  const timed = ordered.filter((event) => event.timing.kind !== 'allDay');
  const range = timelineHours(ordered);

  const categoryOf = (event: CalendarEvent) =>
    categories.find((item) => item.id === event.categoryId) ?? null;

  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-[var(--mt-text)]">
        {formatLongDate(date)}
      </div>

      {allDay.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {allDay.map((event) => (
            <EventBlock
              key={event.id}
              event={event}
              category={categoryOf(event)}
              isOwn={event.owner === signedInAs}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {range === null ? (
        <p className="py-4 text-sm text-[var(--mt-text-muted)]">
          {allDay.length > 0 ? 'Nothing else on.' : 'Nothing on.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {Array.from({ length: range.to - range.from }, (_, offset) => {
            const hour = range.from + offset;
            const inHour = timed.filter((event) => hourOf(event) === hour);
            return (
              <div
                key={hour}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 border-t border-[var(--mt-border)] pt-2"
              >
                <span className="text-xs text-[var(--mt-text-subtle)]">
                  {pad(hour)}:00
                </span>
                <div className="flex flex-col gap-2">
                  {inHour.map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      category={categoryOf(event)}
                      isOwn={event.owner === signedInAs}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
