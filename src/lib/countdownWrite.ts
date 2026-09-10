import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { EventInput } from './calendarRepo';
import type { UserName } from './identity';

export interface TrackerDateForm {
  title: string;
  date: string;
  time: string;
}

function timingFromTime(time: string): EventTiming {
  if (time === '') return { kind: 'allDay', endDate: null };
  return { kind: 'moment', startTime: time };
}

function timingFromEdit(event: CalendarEvent, time: string): EventTiming {
  if (time === timeFromEvent(event)) return event.timing;
  return timingFromTime(time);
}

export function eventToInput(event: CalendarEvent): EventInput {
  return {
    owner: event.owner,
    title: event.title,
    date: event.date,
    timing: event.timing,
    notes: event.notes,
    countdown: event.countdown,
    categoryId: event.categoryId,
  };
}

export function countdownAddInput(
  form: TrackerDateForm,
  owner: UserName,
): EventInput {
  return {
    owner,
    title: form.title.trim(),
    date: form.date,
    timing: timingFromTime(form.time),
    notes: null,
    countdown: true,
    categoryId: null,
  };
}

export function countdownEditInput(
  event: CalendarEvent,
  form: TrackerDateForm,
): EventInput {
  return {
    ...eventToInput(event),
    title: form.title.trim(),
    date: form.date,
    timing: timingFromEdit(event, form.time),
    countdown: true,
  };
}

export function untickCountdown(event: CalendarEvent): EventInput {
  return { ...eventToInput(event), countdown: false };
}

export type CountdownDeleteChoice = 'untick' | 'everywhere' | 'cancel';

export type CountdownDeletePlan =
  | { action: 'none' }
  | { action: 'update'; input: EventInput }
  | { action: 'delete'; id: string };

export function planCountdownDelete(
  event: CalendarEvent,
  choice: CountdownDeleteChoice,
): CountdownDeletePlan {
  if (choice === 'untick') {
    return { action: 'update', input: untickCountdown(event) };
  }
  if (choice === 'everywhere') {
    return { action: 'delete', id: event.id };
  }
  return { action: 'none' };
}

export function timeFromEvent(event: CalendarEvent): string {
  return event.timing.kind === 'allDay' ? '' : event.timing.startTime;
}

export function validateTrackerForm(form: TrackerDateForm): string | null {
  if (form.title.trim() === '') return 'Give it a name.';
  if (form.date === '') return 'Pick a date.';
  return null;
}
