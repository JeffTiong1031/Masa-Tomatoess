import { db, type PendingMeal } from '@/db/db';
import { insertMeal, uploadPhoto } from '@/lib/mealRepo';
import type { UserName } from '@/lib/identity';
import type { MealEntry, MealSlot } from '@/lib/meals';

export interface QueuedInput {
  owner: UserName;
  date: string;
  atTime: string;
  slot: MealSlot;
  full: Blob;
  thumb: Blob;
}

export async function queueMeal(input: QueuedInput): Promise<number> {
  return (await db.pendingMeals.add({ ...input, createdAt: Date.now() })) as number;
}

export async function pendingFor(date: string): Promise<PendingMeal[]> {
  try {
    return await db.pendingMeals.where('date').equals(date).toArray();
  } catch (err) {
    console.error('Failed to read pending meals:', err);
    return [];
  }
}

async function flush(pending: PendingMeal): Promise<MealEntry | null> {
  const photo = await uploadPhoto(
    pending.owner,
    pending.date,
    pending.full,
    pending.thumb,
  );
  if (photo === null) return null;

  const entry = await insertMeal({
    owner: pending.owner,
    date: pending.date,
    atTime: pending.atTime,
    slot: pending.slot,
    photo,
    dish: 'Not identified yet',
    calories: 0,
    source: 'photo',
  });
  if (entry === null) return null;

  await db.pendingMeals.delete(pending.id!);
  return entry;
}

export async function syncPendingMeals(): Promise<MealEntry[]> {
  try {
    const waiting = await db.pendingMeals.toArray();
    const settled: MealEntry[] = [];

    for (const pending of waiting) {
      const entry = await flush(pending);
      if (entry) settled.push(entry);
    }

    return settled;
  } catch (err) {
    console.error('Failed to sync pending meals:', err);
    return [];
  }
}
