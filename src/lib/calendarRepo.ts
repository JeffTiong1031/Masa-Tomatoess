import { supabase } from './supabase';
import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { Category, SwatchIndex } from './categories';
import type { UserName } from './identity';

interface EventRow {
  id: string;
  owner: UserName;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  countdown: boolean;
  category_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  swatch: SwatchIndex;
  position: number;
}

export interface EventInput {
  owner: UserName;
  title: string;
  date: string;
  timing: EventTiming;
  notes: string | null;
  countdown: boolean;
  categoryId: string | null;
}

function trimTime(value: string | null): string | null {
  return value === null ? null : value.slice(0, 5);
}

function toTiming(row: EventRow): EventTiming {
  const start = trimTime(row.start_time);
  if (start === null) return { kind: 'allDay', endDate: row.end_date };

  const end = trimTime(row.end_time);
  if (end === null) return { kind: 'moment', startTime: start };

  return { kind: 'span', startTime: start, endTime: end };
}

function toColumns(input: EventInput) {
  const { timing } = input;
  return {
    owner: input.owner,
    title: input.title.trim(),
    date: input.date,
    end_date: timing.kind === 'allDay' ? timing.endDate : null,
    start_time: timing.kind === 'allDay' ? null : timing.startTime,
    end_time: timing.kind === 'span' ? timing.endTime : null,
    notes: input.notes,
    countdown: input.countdown,
    category_id: input.categoryId,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchEvents(): Promise<CalendarEvent[] | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(
      'id, owner, title, date, end_date, start_time, end_time, notes, countdown, category_id',
    )
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load calendar events:', error);
    return null;
  }

  return (data as EventRow[]).map((row) => ({
    id: row.id,
    owner: row.owner,
    title: row.title,
    date: row.date,
    timing: toTiming(row),
    notes: row.notes,
    countdown: row.countdown,
    categoryId: row.category_id,
  }));
}

export async function insertEvent(input: EventInput): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').insert(toColumns(input));

  if (error) {
    console.error('Failed to add event:', error);
    return false;
  }
  return true;
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_events')
    .update(toColumns(input))
    .eq('id', id);

  if (error) {
    console.error('Failed to update event:', error);
    return false;
  }
  return true;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete event:', error);
    return false;
  }
  return true;
}

export async function fetchCategories(): Promise<Category[] | null> {
  const { data, error } = await supabase
    .from('calendar_categories')
    .select('id, name, swatch, position')
    .order('position', { ascending: true });

  if (error) {
    console.error('Failed to load categories:', error);
    return null;
  }

  return data as CategoryRow[];
}

export async function insertCategory(
  name: string,
  swatch: SwatchIndex,
  position: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_categories')
    .insert({ name: name.trim(), swatch, position });

  if (error) {
    console.error('Failed to add category:', error);
    return false;
  }
  return true;
}

export async function updateCategory(
  id: string,
  name: string,
  swatch: SwatchIndex,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_categories')
    .update({ name: name.trim(), swatch })
    .eq('id', id);

  if (error) {
    console.error('Failed to update category:', error);
    return false;
  }
  return true;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_categories').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete category:', error);
    return false;
  }
  return true;
}
