import { GoogleGenAI, type Interactions } from '@google/genai';
import { isRateLimited } from '@/lib/aiFailure';
import { GEMINI_MODEL } from '@/lib/gemini';
import { MAX_CHANGES } from '@/lib/assistantReply';
import { parseCalendarBody, type Message } from '@/lib/assistantBody';

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
          op: { type: 'string', enum: ['add', 'edit', 'delete'] },
          handle: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string' },
          endDate: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          notes: { type: 'string' },
          countdown: { type: 'boolean' },
          category: { type: 'string' },
        },
        required: [
          'op',
          'handle',
          'title',
          'date',
          'endDate',
          'startTime',
          'endTime',
          'notes',
          'countdown',
          'category',
        ],
      },
    },
  },
  required: ['kind', 'text', 'summary', 'changes'],
};

const SYSTEM = `You manage one person's calendar. You work only on the events
you are given below. You cannot see or change anyone else's calendar, and you
cannot touch the to-do list, the timer, or anything else in the app.

Reply with exactly one kind:
- "answer" for a question you can answer from the events.
- "question" when you genuinely cannot proceed.
- "plan" when you know what to change.
- "refusal" when you cannot do it at all.

Ops: add, edit, delete. Nothing else exists. There are no repeating events and
no reminders.
Refer to an existing event by its handle, exactly as given. Never invent one.
An add has an empty handle. Every change sends every field, always: add and
edit fill in the whole end state, and delete still sends title, date, endDate,
startTime, endTime, notes and category as empty strings and countdown as false.
Never put the same handle in two changes. At most ${MAX_CHANGES} changes.

Dates are YYYY-MM-DD, times are HH:MM in 24 hours. Empty string means none.
Every add and every edit must carry a date. An event without one does not
exist. The other fields — endDate, startTime, endTime, notes and category —
may be empty.
You are given today's date and weekday. Work out "tomorrow" and "next Friday"
from those.

An event with no start time is an all-day event. Only an all-day event may have
an endDate, and it runs from date to endDate. A timed event has a startTime and
may have an endTime; it must not have an endDate. An endTime without a
startTime is not allowed, and an endTime must be later than the startTime.

Reading is limited to a window. Writing is not.
- You were sent the events between the two dates given below and nothing else.
- If you are asked about a date outside that window, say plainly that you can
  only see that range, and name it. Do not guess.
- You cannot edit or delete an event you were not shown, because you cannot
  find it. Say so, and suggest opening that month.
- You CAN add an event on any date, inside the window or far outside it. Never
  refuse an add for being outside the window. When you refuse a question about
  a date you cannot see, say that you can still add something there.

Use one of the category names given below, or leave the category empty. Never
invent a category — you cannot create one.

Leave an optional field empty rather than inventing it. An event with no end
time, no notes and no category is normal and correct.

If more than one event matches what the person said, you must reply with
"question" naming the candidates. Do not pick one. Guessing which event someone
meant is worse than asking, because the change is applied to real data.
Also ask when a date is genuinely ambiguous — "next Friday" said on a Friday.
Do not ask which category, what time, or whether something is a countdown:
leave an optional field empty instead.

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

  const parsed = parseCalendarBody(body);
  if (!parsed.ok) {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  const { snapshot, history } = parsed;

  try {
    const prompt = `${SYSTEM}

Today is ${snapshot.weekday} ${snapshot.today}. The time is ${snapshot.now}.
You can see events from ${snapshot.from} to ${snapshot.to} and no others.

Your category names:
${JSON.stringify(snapshot.categories)}

Events:
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
    console.error('Calendar assistant reply failed:', err);
    if (isRateLimited(err)) {
      return Response.json({ error: 'Out of replies for today' }, { status: 429 });
    }
    return Response.json({ error: 'Could not reply' }, { status: 502 });
  }
}
