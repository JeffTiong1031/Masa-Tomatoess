import type { CalendarEvent } from '@/lib/calendarEvent';
import { sortDay, timelineHours } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { formatLongDate } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import EventBlock from './EventBlock';

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function eventTimeSpan(event: CalendarEvent): { startMin: number; endMin: number } {
  if (event.timing.kind === 'span') {
    return {
      startMin: parseMinutes(event.timing.startTime),
      endMin: parseMinutes(event.timing.endTime),
    };
  }
  if (event.timing.kind === 'moment') {
    const startMin = parseMinutes(event.timing.startTime);
    return { startMin, endMin: startMin + 60 };
  }
  return { startMin: 0, endMin: 0 };
}

interface PositionedEvent {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  column: number;
  maxColumns: number;
}

function layoutEvents(events: CalendarEvent[]): PositionedEvent[] {
  const positioned = events.map(event => {
    const { startMin, endMin } = eventTimeSpan(event);
    return { event, startMin, endMin, column: 0, maxColumns: 1 };
  });

  positioned.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const clusters: PositionedEvent[][] = [];
  let currentCluster: PositionedEvent[] = [];
  let clusterEnd = 0;

  for (const pos of positioned) {
    if (pos.startMin >= clusterEnd) {
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }
      currentCluster = [pos];
      clusterEnd = pos.endMin;
    } else {
      currentCluster.push(pos);
      clusterEnd = Math.max(clusterEnd, pos.endMin);
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  for (const cluster of clusters) {
    const columns: PositionedEvent[][] = [];
    for (const pos of cluster) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastInCol = col[col.length - 1];
        if (lastInCol.endMin <= pos.startMin) {
          col.push(pos);
          pos.column = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        pos.column = columns.length;
        columns.push([pos]);
      }
    }
    const maxCols = columns.length;
    for (const pos of cluster) {
      pos.maxColumns = maxCols;
    }
  }

  return positioned;
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

  const positionedTimed = layoutEvents(timed);
  const totalMinutes = (range.to - range.from) * 60;
  const hourHeight = 4; // 4rem per hour
  const totalHeight = (range.to - range.from) * hourHeight;

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

      <div className="relative mt-2" style={{ height: `${totalHeight}rem` }}>
        {Array.from({ length: range.to - range.from }, (_, offset) => {
          const hour = range.from + offset;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-[var(--mt-border)] pointer-events-none"
              style={{ top: `${offset * hourHeight}rem`, height: `${hourHeight}rem` }}
            >
              <span className="absolute -top-2.5 left-0 bg-transparent pr-2 text-xs text-[var(--mt-text-subtle)]">
                {pad(hour)}:00
              </span>
            </div>
          );
        })}
        <div className="absolute top-0 bottom-0 left-[3.5rem] right-0">
          {positionedTimed.map((pos) => {
            const durationMin = Math.max(pos.endMin - pos.startMin, 0);
            const topPct = ((pos.startMin - range.from * 60) / totalMinutes) * 100;
            const heightPct = (durationMin / totalMinutes) * 100;
            const widthPct = 100 / pos.maxColumns;
            const leftPct = pos.column * widthPct;
            const dense = durationMin < 45;

            return (
              <div
                key={pos.event.id}
                className="absolute p-0.5"
                style={{
                  top: `${topPct}%`,
                  height: `${heightPct}%`,
                  minHeight: '2rem',
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                }}
              >
                <EventBlock
                  event={pos.event}
                  category={categoryOf(pos.event)}
                  isOwn={pos.event.owner === signedInAs}
                  dense={dense}
                  onOpen={onOpen}
                  className={`h-full !min-h-0 overflow-hidden ${dense ? '' : 'py-1'}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
