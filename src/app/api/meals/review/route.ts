import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.7-flash';

const SYSTEM = `You are reviewing one person's week of meals in Malaysia.

Name changes anchored to what they actually ate — which meals run large, which
days blow out, what repeats too often, what to swap for what. Refer to their
real dishes by name.

Do not write generic advice. "Eat more vegetables", "drink more water" and
"watch your portions" are forbidden — they are true of everyone and useful to
nobody.

Stay on food: swaps, portions and timing. Do not set calorie targets, comment on
weight, or make any claim about health.

Write under 150 words in plain prose. No headings, no bullet points.`;

interface ReviewMeal {
  date: string;
  slot: string;
  dish: string;
  calories: number;
}

function isReviewMeal(value: unknown): value is ReviewMeal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.date === 'string' &&
    typeof candidate.slot === 'string' &&
    typeof candidate.dish === 'string' &&
    typeof candidate.calories === 'number' &&
    Number.isFinite(candidate.calories)
  );
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Reviewer not configured' }, { status: 503 });
  }

  try {
    const { meals, sealedCount } = await request.json();

    if (!Array.isArray(meals) || meals.length === 0 || !meals.every(isReviewMeal)) {
      return Response.json({ error: 'Missing or invalid meals' }, { status: 400 });
    }

    if (
      typeof sealedCount !== 'number' ||
      !Number.isFinite(sealedCount) ||
      !Number.isInteger(sealedCount) ||
      sealedCount < 0
    ) {
      return Response.json({ error: 'Missing or invalid sealedCount' }, { status: 400 });
    }

    const lines = meals
      .map((m: ReviewMeal) => `${m.date} ${m.slot}: ${m.dish} (${m.calories} kcal)`)
      .join('\n');

    const prompt = `${SYSTEM}

You are looking at ${sealedCount} complete ${sealedCount === 1 ? 'day' : 'days'}, not a full week. Write about ${sealedCount === 1 ? 'that day' : 'those days'} only, and do not generalise beyond them.

${lines}`;

    const client = new GoogleGenAI({ apiKey: key });
    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
    });

    if (!interaction.output_text) {
      return Response.json({ error: 'Could not review' }, { status: 502 });
    }

    return Response.json({ body: interaction.output_text });
  } catch (err) {
    console.error('Review failed:', err);
    return Response.json({ error: 'Could not review' }, { status: 502 });
  }
}
