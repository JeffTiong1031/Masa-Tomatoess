import type { DateGroup } from '@/lib/calendarSearch';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { formatLongDate } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import EventBlock from './EventBlock';

export default function SearchResults({
  groups,
  today,
  categories,
  signedInAs,
  onOpen,
}: {
  groups: DateGroup[];
  today: string;
  categories: Category[];
  signedInAs: UserName;
  onOpen: (event: CalendarEvent) => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--mt-text-muted)]">
        Nothing matches that.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.date} style={{ opacity: group.date < today ? 0.55 : 1 }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]">
            {formatLongDate(group.date)}
          </div>
          <div className="flex flex-col gap-2">
            {group.events.map((event) => (
              <EventBlock
                key={event.id}
                event={event}
                category={
                  categories.find((item) => item.id === event.categoryId) ?? null
                }
                isOwn={event.owner === signedInAs}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
