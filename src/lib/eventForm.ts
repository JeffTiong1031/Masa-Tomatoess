import type { EventTiming } from './calendarEvent';

export interface EventDraft {
  title: string;
  date: string;
  allDay: boolean;
  endDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  countdown: boolean;
  categoryId: string | null;
}

export type EventField = 'title' | 'date' | 'endDate' | 'startTime' | 'endTime';

export interface EventError {
  field: EventField;
  message: string;
}

export function validate(draft: EventDraft): EventError | null {
  if (draft.title.trim() === '') {
    return { field: 'title', message: 'Give the event a name.' };
  }

  if (draft.date === '') {
    return { field: 'date', message: 'Pick a date.' };
  }

  if (draft.endTime !== '' && draft.startTime === '') {
    return {
      field: 'startTime',
      message: 'Add a start time, or clear the end time.',
    };
  }

  if (draft.endTime !== '' && draft.endTime <= draft.startTime) {
    return { field: 'endTime', message: 'The end time must be after the start.' };
  }

  if (draft.endDate !== '' && draft.startTime !== '') {
    return {
      field: 'endDate',
      message: 'Only all-day events can run across several days.',
    };
  }

  if (draft.endDate !== '' && draft.endDate < draft.date) {
    return { field: 'endDate', message: 'The last day cannot be before the first.' };
  }

  return null;
}

export function toTiming(draft: EventDraft): EventTiming {
  if (draft.startTime === '') {
    return { kind: 'allDay', endDate: draft.endDate === '' ? null : draft.endDate };
  }
  if (draft.endTime === '') {
    return { kind: 'moment', startTime: draft.startTime };
  }
  return { kind: 'span', startTime: draft.startTime, endTime: draft.endTime };
}
