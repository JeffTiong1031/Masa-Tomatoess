import { GoogleGenAI, type Interactions } from '@google/genai';
import type { Estimate, MealSlot } from '@/lib/meals';

const MODEL = 'gemini-3.7-flash';

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

interface EstimateRequestBody {
  image?: string;
  text?: string;
  slot: MealSlot;
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Estimator not configured' }, { status: 503 });
  }

  const { image, text, slot }: EstimateRequestBody = await request.json();

  const client = new GoogleGenAI({ apiKey: key });
  const input: Interactions.Content[] = image
    ? [
        { type: 'text', text: `${SYSTEM}\n\nThis was eaten as ${slot}.` },
        { type: 'image', mime_type: 'image/webp', data: image },
      ]
    : [{ type: 'text', text: `${SYSTEM}\n\nEaten as ${slot}: ${text}` }];

  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: SCHEMA,
      },
    });

    return Response.json(JSON.parse(interaction.output_text!) as Estimate);
  } catch (err) {
    console.error('Estimate failed:', err);
    return Response.json({ error: 'Could not estimate' }, { status: 502 });
  }
}
