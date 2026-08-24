import { GoogleGenAI, type Interactions } from '@google/genai';
import { isRateLimited } from '@/lib/aiFailure';
import { GEMINI_MODEL } from '@/lib/gemini';
import type { Confidence, Estimate, MealSlot } from '@/lib/meals';

const SCHEMA = {
  type: 'object',
  properties: {
    dish: { type: 'string' },
    detail: { type: 'string' },
    calories: { type: 'integer' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['dish', 'detail', 'calories', 'confidence'],
};

const SYSTEM = `You are reading a meal eaten in Malaysia — home cooking or hawker
food. Expect nasi lemak, economy rice, chap fan, chicken rice, kolo mee, hotpot,
roti canai, and similar. Name the dish plainly.

Judge the portion against the plate or bowl and commit to a single calorie
number for what you can actually see. Do not give a range.

Put preparation and sides in "detail" — roasted or steamed, fried or soup,
what came with it.

Set confidence to "low" when the image is too dark, too partial, or is not food.
A low-confidence answer is correct and useful; a confident guess at an
unreadable photo is not.`;

const MAX_IMAGE_CHARS = 1_048_576;
const MAX_TEXT_CHARS = 500;

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low'];

function toEstimate(value: unknown): Estimate | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  const { dish, detail, calories, confidence } = candidate;
  if (typeof dish !== 'string' || dish.trim() === '') return null;
  if (typeof detail !== 'string') return null;
  if (typeof calories !== 'number' || !Number.isFinite(calories) || calories < 0) return null;
  if (typeof confidence !== 'string' || !CONFIDENCES.includes(confidence as Confidence)) return null;

  return {
    dish,
    detail,
    calories: Math.round(calories),
    confidence: confidence as Confidence,
  };
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Estimator not configured' }, { status: 503 });
  }

  try {
    const { image, text, slot } = await request.json();

    if (typeof slot !== 'string' || !SLOTS.includes(slot as MealSlot)) {
      return Response.json({ error: 'Missing or invalid slot' }, { status: 400 });
    }

    const hasImage = typeof image === 'string' && image.length > 0;
    const hasText = typeof text === 'string' && text.trim().length > 0;

    if (!hasImage && !hasText) {
      return Response.json({ error: 'Provide an image or a description' }, { status: 400 });
    }

    if (hasImage && image.length > MAX_IMAGE_CHARS) {
      return Response.json({ error: 'Image too large' }, { status: 413 });
    }

    if (hasText && text.length > MAX_TEXT_CHARS) {
      return Response.json({ error: 'Description too long' }, { status: 413 });
    }

    const client = new GoogleGenAI({ apiKey: key });
    const input: Interactions.Content[] = hasImage
      ? [
          { type: 'text', text: `${SYSTEM}\n\nThis was eaten as ${slot}.` },
          { type: 'image', mime_type: 'image/webp', data: image },
        ]
      : [{ type: 'text', text: `${SYSTEM}\n\nEaten as ${slot}: ${text}` }];

    const interaction = await client.interactions.create({
      model: GEMINI_MODEL,
      input,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: SCHEMA,
      },
    });

    if (!interaction.output_text) {
      return Response.json({ error: 'Could not estimate' }, { status: 502 });
    }

    const estimate = toEstimate(JSON.parse(interaction.output_text));
    if (!estimate) {
      return Response.json({ error: 'Could not estimate' }, { status: 502 });
    }

    return Response.json(estimate);
  } catch (err) {
    console.error('Estimate failed:', err);
    if (isRateLimited(err)) {
      return Response.json({ error: 'Out of readings for today' }, { status: 429 });
    }
    return Response.json({ error: 'Could not estimate' }, { status: 502 });
  }
}
