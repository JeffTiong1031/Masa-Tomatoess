'use client';

import { cloneElement } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate } from '@/lib/calendarViews';
import { addDays } from '@/lib/dates';
import { CALENDAR_HEATMAP_RAMP } from '@/lib/heatmapTheme';

const CALENDAR_THEME = {
  light: [...CALENDAR_HEATMAP_RAMP],
  dark: [...CALENDAR_HEATMAP_RAMP],
};

const MAX_LEVEL = 4;

function yearDates(year: number): string[] {
  const dates: string[] = [];
  const last = `${year}-12-31`;
  for (let date = `${year}-01-01`; date <= last; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export default function YearHeatmap({
  year,
  events,
  onSelect,
}: {
  year: number;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
}) {
  const dates = yearDates(year);
  const counts = countsByDate(events, dates);
  const data = dates.map((date) => ({
    date,
    count: counts[date],
    level: Math.min(counts[date], MAX_LEVEL),
  }));

  return (
    <ActivityCalendar
      data={data}
      theme={CALENDAR_THEME}
      colorScheme="light"
      blockSize={10}
      blockMargin={3}
      fontSize={11}
      maxLevel={MAX_LEVEL}
      weekStart={1}
      renderBlock={(block, activity) =>
        cloneElement(block, {
          onClick: () => onSelect(activity.date),
          style: { cursor: 'pointer' },
        })
      }
      labels={{
        legend: { less: 'Quiet', more: 'Busy' },
        months: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ],
      }}
    />
  );
}
