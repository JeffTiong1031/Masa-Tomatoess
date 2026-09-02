import { GoogleGenAI, type Interactions } from '@google/genai';
import { isRateLimited } from '@/lib/aiFailure';
import { GEMINI_MODEL } from '@/lib/gemini';
import { MAX_CHANGES } from '@/lib/assistantReply';
import { parseAssistantBody, type Message } from '@/lib/assistantBody';

export const maxDuration = 30;

const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['answer', 'question', 'plan', 'refusal'] },
    text: { type: 'string' },
    summary: { type: 'string' },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'edit', 'complete', 'reopen', 'delete'] },
          handle: { type: 'string' },
          title: { type: 'string' },
          dueDate: { type: 'string' },
          dueTime: { type: 'string' },
        },
        required: ['op', 'handle', 'title', 'dueDate', 'dueTime'],
      },
    },
  },
  required: ['kind', 'text', 'summary', 'changes'],
};

const SYSTEM = `You manage one person's to-do list. You work only on the rows
you are given below. You cannot see or change anyone else's list, and you cannot
touch the calendar, the timer, or anything else in the app.

Reply with exactly one kind:
- "answer" for a question you can answer from the rows.
- "question" when you genuinely cannot proceed.
- "plan" when you know what to change.
- "refusal" when you cannot do it at all.

Ops: add, edit, complete, reopen, delete. Nothing else exists.
Refer to an existing task by its handle, exactly as given. Never invent one.
An add has an empty handle. Every change sends every field, always: add and
edit fill in the whole end state, and complete, reopen and delete still send
title, dueDate and dueTime as empty strings.
Never put the same handle in two changes. At most ${MAX_CHANGES} changes.

Dates are YYYY-MM-DD, times are HH:MM in 24 hours. Empty string means none.
You are given today's date and weekday. Work out "tomorrow" and "next Friday"
from those.

You can see every open task whatever its date, and tasks completed in the last
7 days. Older completed tasks were not sent — say so rather than guess.
Adding is not limited by that: you can add a task on any date.

Leave an optional field empty rather than inventing it. A task with no time is
normal and correct.

If more than one task matches what the person said, you must reply with
"question" naming the candidates. Do not pick one. Guessing which task someone
meant is worse than asking, because the change is applied to real data.
Also ask when a date is genuinely ambiguous — "next Friday" said on a Friday.
Do not ask which category or what time: leave an optional field empty instead.

Fill only the fields that belong to your reply kind.
A "plan" fills "summary" and "changes", and leaves "text" as an empty string.
An "answer", "question" or "refusal" fills "text", and leaves "summary" as an
empty string and "changes" as an empty list. Never put changes in a reply that
is not a plan.

A cancelled plan was rejected. Do not offer it again unless asked.`;

function transcript(history: Message[]): string {
  return history
    .map((message) => `${message.role === 'you' ? 'Person' : 'You'}: ${message.text}`)
    .join('\n');
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Assistant not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }

  const parsed = parseAssistantBody(body);
  if (!parsed.ok) {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  const { snapshot, history } = parsed;

  try {
    const prompt = `${SYSTEM}

Today is ${snapshot.weekday} ${snapshot.today}. The time is ${snapshot.now}.

Tasks:
${JSON.stringify(snapshot.rows)}

Conversation so far:
${transcript(history)}`;

    const client = new GoogleGenAI({ apiKey: key });
    const input: Interactions.Content[] = [{ type: 'text', text: prompt }];

    const interaction = await client.interactions.create({
      model: GEMINI_MODEL,
      input,
      response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
    });

    if (!interaction.output_text) {
      return Response.json({ error: 'No reply' }, { status: 502 });
    }

    return Response.json(JSON.parse(interaction.output_text));
  } catch (err) {
    console.error('Assistant reply failed:', err);
    if (isRateLimited(err)) {
      return Response.json({ error: 'Out of replies for today' }, { status: 429 });
    }
    return Response.json({ error: 'Could not reply' }, { status: 502 });
  }
}
