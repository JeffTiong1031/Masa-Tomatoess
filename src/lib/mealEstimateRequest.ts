import { toBase64 } from '@/lib/mealImage';
import type { Estimate, MealSlot } from '@/lib/meals';

export async function estimateForBlob(
  photo: Blob,
  slot: MealSlot,
): Promise<Estimate | null> {
  try {
    const image = toBase64(await photo.arrayBuffer());
    const response = await fetch('/api/meals/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, slot }),
    });
    if (!response.ok) return null;
    return (await response.json()) as Estimate;
  } catch (err) {
    console.error('Estimate request failed:', err);
    return null;
  }
}

export async function estimateForStoredPhoto(
  url: string,
  slot: MealSlot,
): Promise<Estimate | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await estimateForBlob(await response.blob(), slot);
  } catch (err) {
    console.error('Could not read the stored photo:', err);
    return null;
  }
}
