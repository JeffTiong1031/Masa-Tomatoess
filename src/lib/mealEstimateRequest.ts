import { aiFailureForStatus, type AiFailure } from '@/lib/aiFailure';
import { toBase64 } from '@/lib/mealImage';
import type { Estimate, MealSlot } from '@/lib/meals';

export type EstimateResult =
  | { ok: true; estimate: Estimate }
  | { ok: false; failure: AiFailure };

export async function estimateForBlob(
  photo: Blob,
  slot: MealSlot,
): Promise<EstimateResult> {
  try {
    const image = toBase64(await photo.arrayBuffer());
    const response = await fetch('/api/meals/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, slot }),
    });
    if (!response.ok) {
      return { ok: false, failure: aiFailureForStatus(response.status) };
    }
    return { ok: true, estimate: (await response.json()) as Estimate };
  } catch (err) {
    console.error('Estimate request failed:', err);
    return { ok: false, failure: 'failed' };
  }
}

export async function estimateForStoredPhoto(
  url: string,
  slot: MealSlot,
): Promise<EstimateResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, failure: 'failed' };
    return await estimateForBlob(await response.blob(), slot);
  } catch (err) {
    console.error('Could not read the stored photo:', err);
    return { ok: false, failure: 'failed' };
  }
}
