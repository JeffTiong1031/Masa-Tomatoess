import { supabase } from './supabase';
import { weekStart } from './mealWeek';
import type { UserName } from './identity';
import type {
  MealDay,
  MealEntry,
  MealPhoto,
  MealReview,
  MealSlot,
  MealSource,
} from './meals';

const BUCKET = 'meal-photos';

interface MealRow {
  id: string;
  owner: UserName;
  date: string;
  at_time: string | null;
  slot: MealSlot;
  photo_path: string | null;
  thumb_path: string | null;
  dish: string;
  calories: number;
  source: MealSource;
  updated_at: string;
}

interface DayRow {
  date: string;
  owner: UserName;
  sealed: boolean;
}

interface ReviewRow {
  week_start: string;
  owner: UserName;
  body: string;
  stale: boolean;
  created_at: string;
}

export interface MealInput {
  owner: UserName;
  date: string;
  atTime: string | null;
  slot: MealSlot;
  photo: MealPhoto | null;
  dish: string;
  calories: number;
  source: MealSource;
}

export interface MealPatch {
  dish?: string;
  calories?: number;
  slot?: MealSlot;
}

const MEAL_COLUMNS =
  'id, owner, date, at_time, slot, photo_path, thumb_path, dish, calories, source, updated_at';

function toPhoto(row: MealRow): MealPhoto | null {
  return row.photo_path === null || row.thumb_path === null
    ? null
    : { fullPath: row.photo_path, thumbPath: row.thumb_path };
}

function toEntry(row: MealRow): MealEntry {
  return {
    id: row.id,
    owner: row.owner,
    date: row.date,
    atTime: row.at_time === null ? null : row.at_time.slice(0, 5),
    slot: row.slot,
    photo: toPhoto(row),
    dish: row.dish,
    calories: row.calories,
    source: row.source,
    updatedAt: row.updated_at,
  };
}

export function photoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchMeals(
  from: string,
  to: string,
): Promise<MealEntry[] | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .select(MEAL_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load meals:', error);
    return null;
  }

  return (data as MealRow[]).map(toEntry);
}

export async function uploadPhoto(
  owner: UserName,
  date: string,
  full: Blob,
  thumb: Blob,
): Promise<MealPhoto | null> {
  const id = crypto.randomUUID();
  const fullPath = `${owner}/${date}/${id}.webp`;
  const thumbPath = `${owner}/${date}/${id}-thumb.webp`;

  const bucket = supabase.storage.from(BUCKET);
  const [fullResult, thumbResult] = await Promise.all([
    bucket.upload(fullPath, full, { contentType: 'image/webp' }),
    bucket.upload(thumbPath, thumb, { contentType: 'image/webp' }),
  ]);

  if (fullResult.error || thumbResult.error) {
    console.error('Failed to upload photo:', fullResult.error ?? thumbResult.error);

    const orphans = [
      ...(fullResult.error ? [] : [fullPath]),
      ...(thumbResult.error ? [] : [thumbPath]),
    ];
    if (orphans.length > 0) await bucket.remove(orphans);

    return null;
  }

  return { fullPath, thumbPath };
}

export async function insertMeal(input: MealInput): Promise<MealEntry | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .insert({
      owner: input.owner,
      date: input.date,
      at_time: input.atTime,
      slot: input.slot,
      photo_path: input.photo?.fullPath ?? null,
      thumb_path: input.photo?.thumbPath ?? null,
      dish: input.dish.trim(),
      calories: input.calories,
      source: input.source,
      updated_at: new Date().toISOString(),
    })
    .select(MEAL_COLUMNS)
    .single();

  if (error) {
    console.error('Failed to add meal:', error);
    return null;
  }

  await markReviewStale(weekStart(input.date), input.owner);
  return toEntry(data as MealRow);
}

export async function updateMeal(
  id: string,
  patch: MealPatch,
): Promise<MealEntry | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(MEAL_COLUMNS)
    .single();

  if (error) {
    console.error('Failed to update meal:', error);
    return null;
  }

  const entry = toEntry(data as MealRow);
  await markReviewStale(weekStart(entry.date), entry.owner);
  return entry;
}

export async function deleteMeal(entry: MealEntry): Promise<boolean> {
  const { error } = await supabase.from('meal_entries').delete().eq('id', entry.id);

  if (error) {
    console.error('Failed to delete meal:', error);
    return false;
  }

  if (entry.photo) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([entry.photo.fullPath, entry.photo.thumbPath]);

    if (storageError) console.error('Failed to remove meal photos:', storageError);
  }

  await markReviewStale(weekStart(entry.date), entry.owner);
  return true;
}

export async function fetchDays(
  from: string,
  to: string,
): Promise<MealDay[] | null> {
  const { data, error } = await supabase
    .from('meal_days')
    .select('date, owner, sealed')
    .gte('date', from)
    .lte('date', to);

  if (error) {
    console.error('Failed to load meal days:', error);
    return null;
  }

  return data as DayRow[];
}

export async function sealDay(date: string, owner: UserName): Promise<boolean> {
  const { error } = await supabase
    .from('meal_days')
    .upsert({ date, owner, sealed: true }, { onConflict: 'date,owner' });

  if (error) {
    console.error('Failed to seal day:', error);
    return false;
  }
  return true;
}

export async function fetchReview(
  week: string,
  owner: UserName,
): Promise<MealReview | null> {
  const { data, error } = await supabase
    .from('meal_reviews')
    .select('week_start, owner, body, stale, created_at')
    .eq('week_start', week)
    .eq('owner', owner)
    .maybeSingle();

  if (error) {
    console.error('Failed to load review:', error);
    return null;
  }
  if (data === null) return null;

  const row = data as ReviewRow;
  return {
    weekStart: row.week_start,
    owner: row.owner,
    body: row.body,
    stale: row.stale,
    createdAt: row.created_at,
  };
}

export async function saveReview(
  week: string,
  owner: UserName,
  body: string,
): Promise<boolean> {
  const { error } = await supabase.from('meal_reviews').upsert(
    {
      week_start: week,
      owner,
      body,
      stale: false,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'week_start,owner' },
  );

  if (error) {
    console.error('Failed to save review:', error);
    return false;
  }
  return true;
}

export async function markReviewStale(
  week: string,
  owner: UserName,
): Promise<void> {
  const { error } = await supabase
    .from('meal_reviews')
    .update({ stale: true })
    .eq('week_start', week)
    .eq('owner', owner);

  if (error) console.error('Failed to mark review stale:', error);
}
