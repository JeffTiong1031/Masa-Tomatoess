# Meals — photo story and calorie tracking — design

**Date:** 2026-08-23
**Status:** Awaiting review
**Builds on:** [2026-08-19-study-calendar-design.md](2026-08-19-study-calendar-design.md)

## 1. Context

`/meals` ships today as a picture. Two hardcoded days, five sample rows under
`SampleChip`, a `disabled` "Add meal" button above a `ComingSoon` note reading
"Nothing here saves yet." Nothing saves.

This spec replaces all of it with two features that share one photo.

**The story.** Jeff and Rachel photograph what they eat. Each day becomes a
square in a month grid; tapping it opens that day's meals full-screen, both
people's photos woven into one timeline in the order they were eaten. The
interleaving is the point — a day should read as a shared day, not as two
separate food diaries printed side by side.

**The count.** The same photo is read by Gemini, which names the dish and
estimates its calories. The person who shot it confirms or corrects the number.
Daily and weekly totals accumulate per person, and a button produces a written,
prescriptive review of the week.

Three things distinguish this from the four mutable features already shipped.

**It stores files, not just rows.** Timetable, Cycle and Calendar are text in
Postgres. This is the first feature with binary content, which brings a storage
bucket, two image sizes, and an upload that can fail halfway.

**It calls a paid third party.** No feature so far has depended on an external
service beyond Supabase. That dependency is optional at every point — a photo
without an estimate is still a photo — but it shapes the error handling.

**It cannot work on localhost.** Every other feature does. This one requires the
app to be reachable from a phone in a restaurant, which the app currently is
not. See §3.

## 2. Decisions

Recorded with their reasoning, because several were close calls and the reasons
will not be recoverable from the code.

**The AI guesses, the human confirms.** Photo-based calorie estimation is
roughly 20–40% off on mixed local food — the portion of rice, the oil the stall
used, and the sweetness of the drink are all invisible. A guess-then-confirm
flow costs about five seconds per meal and makes the resulting totals the
user's rather than the model's. Fully automatic logging was rejected: it drifts,
and the drift is invisible.

**Both people, separate totals.** The original request wrote the story as joint
("both of us") and the counting as singular ("my diet"). Resolved as: shared
story, per-person totals, per-person reviews. Rachel's calorie data is her own.

**Advice is prescriptive and on demand.** Pressing a button beats an automatic
weekly report — advice that was asked for gets read, advice that appears
unbidden gets dismissed, and on demand means the week can be re-reviewed after
a bad estimate is corrected. Reviews are cached per week and marked stale when
an underlying meal changes.

**A daily target is optional, not a setup step.** Prescriptive advice is
sharper with a number to aim at, but requiring one before the feature works
adds a setup screen nobody asked for. The review works from patterns alone and
uses the target only if present. Deferred out of v1 entirely — see §12.

**A food day runs 04:00 to 04:00.** Supper eaten at 1am belongs to the day the
eater was still living; filing it under the calendar date would show a 900 kcal
breakfast on a day the previous evening looked skipped. Four in the morning is
the gap where neither person eats. The boundary is 04:00 exactly and the date
is stored on the row, never recomputed from the timestamp at read time.

**Incomplete days sit out of the week.** A day with breakfast and lunch but no
dinner reads as ~1,100 kcal. Averaged into a week, it drags every total down
and the review confidently advises eating more. So a day counts toward the week
only once its owner has sealed it, and the gap-filling flow exists to make
sealing easy on the days a photo was missed.

**The nudge is a card, not a notification.** At 8am the previous food day has
been closed for four hours. Opening the app after that shows an unfinished-day
card at the top of `/meals`. Real push notifications need a service worker, a
per-device subscription, a scheduled server, and permission on each phone — and
on iOS only work for a home-screen install. Deferred; the card is designed so
push can drive the same card later without rework.

**Photo exposure is an accepted risk.** Raised and declined. See §12.

## 3. Prerequisites

Three things must exist before any of this functions. None are code in this
repo, and the first is not optional.

**A public host.** The app runs on `localhost:3000` via `PomodoroOS.vbs`. There
is no Vercel config, no deployment, no public URL. Photographing a meal away
from home requires the app to be on the internet, and browser camera access
requires HTTPS. Connecting the repo to Vercel and moving `.env.local` into its
environment settings is a small job, but it precedes everything here.

**The SQL in §4 run against Supabase**, plus a `meal-photos` storage bucket
created with listing disabled. Note that the `/cycle` tables from the
2026-08-16 spec have still not been created; both sets of DDL can be run in one
sitting.

**A `GEMINI_API_KEY`** in the host's environment. Server-side only — no
`NEXT_PUBLIC_` prefix, and never referenced outside the route handler in §6.

## 4. Data model

### Supabase

```sql
create table meal_entries (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null check (owner in ('Jeff', 'Rachel')),
  date       date not null,
  at_time    time,
  slot       text not null check (slot in ('breakfast','lunch','dinner','snack')),
  photo_path text,
  thumb_path text,
  dish       text not null check (length(trim(dish)) > 0),
  calories   integer not null check (calories >= 0),
  source     text not null check (source in ('photo', 'typed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_entries_photo_pairs
    check ((photo_path is null) = (thumb_path is null)),
  constraint meal_entries_typed_has_no_photo
    check (source = 'photo' or photo_path is null)
);

create index meal_entries_date_idx on meal_entries (date);

create table meal_days (
  date   date not null,
  owner  text not null check (owner in ('Jeff', 'Rachel')),
  sealed boolean not null default false,
  primary key (date, owner)
);

create table meal_reviews (
  week_start date not null,
  owner      text not null check (owner in ('Jeff', 'Rachel')),
  body       text not null,
  stale      boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (week_start, owner)
);

alter table meal_entries enable row level security;
alter table meal_days enable row level security;
alter table meal_reviews enable row level security;

create policy "anon reads meal_entries"
  on meal_entries for select to anon using (true);
create policy "anon writes meal_entries"
  on meal_entries for all to anon using (true) with check (true);

create policy "anon reads meal_days"
  on meal_days for select to anon using (true);
create policy "anon writes meal_days"
  on meal_days for all to anon using (true) with check (true);

create policy "anon reads meal_reviews"
  on meal_reviews for select to anon using (true);
create policy "anon writes meal_reviews"
  on meal_reviews for all to anon using (true) with check (true);
```

`date` is the food day the meal counts toward, computed once at capture from the
04:00 boundary and then never recomputed. `at_time` is the wall-clock time it
was eaten, null for gap-filled entries where the eater does not remember.

`source` distinguishes a photographed meal from one typed in during the nudge.
The two check constraints make the pairing explicit: photo and thumbnail exist
together or not at all, and a typed meal never carries either.

`meal_days` is keyed per person because each seals their own day. A row is
written when a day is sealed; absence means unsealed.

`meal_reviews.stale` flips true when any meal inside that week is edited or
deleted after the review was generated. The old body stays readable until the
user asks for a refresh.

The `anon` policies follow the existing house pattern from Calendar and Cycle.
Their weakness is real and accepted — §12.

### Storage

Bucket `meal-photos`, listing disabled, paths shaped
`{owner}/{date}/{uuid}.webp` and `{owner}/{date}/{uuid}-thumb.webp`.

Two sizes are written at capture, in the browser, before upload:

| | Longest edge | Approx size | Used by |
|---|---|---|---|
| Full | 800px | ~300KB | The day story |
| Thumb | 200px | ~15KB | The month grid |

A month grid pulling full-size photos into thirty squares is ~9MB per page
view; thumbnails make it ~450KB. Supabase's server-side image transformation is
a paid-tier feature, so both sizes are produced client-side on a canvas.

Expected growth is roughly 650MB per year for two people at three meals a day,
which exceeds the 1GB free tier in about eighteen months. Not a v1 problem, but
recorded so it is not a surprise.

### Client types

```ts
import type { UserName } from '@/lib/identity';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSource = 'photo' | 'typed';
export type Confidence = 'high' | 'medium' | 'low';

export interface MealPhoto {
  fullPath: string;
  thumbPath: string;
}

export interface MealEntry {
  id: string;
  owner: UserName;
  date: string;
  atTime: string | null;
  slot: MealSlot;
  photo: MealPhoto | null;
  dish: string;
  calories: number;
  source: MealSource;
  updatedAt: string;
}

export interface MealDay {
  date: string;
  owner: UserName;
  sealed: boolean;
}

export interface MealReview {
  weekStart: string;
  owner: UserName;
  body: string;
  stale: boolean;
  createdAt: string;
}

export interface WeekTotals {
  byDate: Record<string, number>;
  total: number;
  sealedCount: number;
}
```

`photo_path` and `thumb_path` collapse into one nullable `MealPhoto` on the
client. The database constraint already guarantees they are null together, so
the client type carries that guarantee in its shape rather than asking callers
to check two fields — and a typed meal is `photo: null`, with no branching on
`source` needed to read it.

Dates and times stay plain strings throughout, following Timetable, Cycle and
Calendar. No `Date` objects cross a module boundary.

### Dexie

One new table, holding meals captured before they reach Supabase.

```ts
export interface PendingMeal {
  id?: number;
  owner: UserName;
  date: string;
  atTime: string;
  slot: MealSlot;
  full: Blob;
  thumb: Blob;
  createdAt: number;
}
```

Added as `db.version(5)`. A capture writes here first and the UI reads it
immediately, so a photo appears in today's square with no network at all. The
sync pass uploads both blobs, inserts the row and deletes the pending record.
This mirrors `sessionSync.ts` — local write first, reconcile after.

The estimate is requested separately from the upload, because the two fail
independently. Online, it is requested straight after capture and returns while
the eater is still choosing the meal slot, so the confirm card is ready by the
time they look at it. Offline, there is no estimate to request; the meal syncs
first and then shows "tap to estimate" until asked. A meal whose upload
succeeded but whose estimate failed is the same state as an offline one, which
is why they share a single path rather than each having their own.

## 5. The logic — `lib/`

Vitest runs pure functions with no DOM and no network, so everything worth
asserting is extracted here. Four modules, each independently testable.

### `lib/mealDay.ts`

```ts
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const DAY_BOUNDARY_HOUR = 4;

export function mealDate(at: Date): string;
export function slotForTime(at: Date): MealSlot;
export function isComplete(entries: MealEntry[]): boolean;
export function dayTotal(entries: MealEntry[]): number;
export function intakeFor(entries: MealEntry[], date: string, owner: UserName): number;
```

`mealDate` applies the 04:00 boundary: anything before 4am returns the previous
calendar date.

`slotForTime` pre-selects the meal type from the clock, covering the full
24 hours against the same boundary:

| 04:00–10:59 | 11:00–15:59 | 16:00–21:59 | 22:00–03:59 |
|---|---|---|---|
| breakfast | lunch | dinner | snack |

`isComplete` requires breakfast, lunch and dinner to be present. Snacks are
optional and never gate completeness.

`intakeFor` exists so `/fitness` can later subtract calories burnt from
calories eaten without knowing anything about how meals are stored. It is the
public seam between the two sections and should not be inlined into a
component.

### `lib/mealEstimate.ts`

```ts
export const PORTION_SMALLER = 0.7;
export const PORTION_LARGER = 1.4;

export type Portion = 'smaller' | 'normal' | 'larger';

export function scaleForPortion(calories: number, portion: Portion): number;
export function needsManualEntry(confidence: Confidence): boolean;
```

The model's number already reflects the portion it can see, so `normal` is
identity and the two multipliers adjust from there. Both are judgement calls,
not measurements, and are pinned by test the way `accents.test.ts` pins the
section colours — so retuning them is a deliberate act visible in a diff.

`needsManualEntry` is true for low confidence and drives the confirm card's
layout flip described in §8.

### `lib/mealStory.ts`

```ts
export function storyOrder(entries: MealEntry[]): MealEntry[];
```

Orders one day's meals from both people into a single timeline. Entries with an
`at_time` sort by it. Entries without one — gap-filled meals — sort at their
slot's nominal position (breakfast 08:00, lunch 13:00, dinner 19:00, snack
22:00) so they land plausibly rather than clustering at the top.

Ordering never groups by person. Two people's meals interleave, which is the
whole reason the story reads as a shared day.

### `lib/mealWeek.ts`

```ts
export function weekStart(date: string): string;
export function weekDates(weekStart: string): string[];
export function sealedDates(days: MealDay[], week: string[]): string[];
export function weekTotals(entries: MealEntry[], sealed: string[]): WeekTotals;
```

Weeks run Monday to Sunday, following `weekdayIndex` in `lib/dates.ts`, which is
already Monday-based. Only sealed dates contribute to totals; unsealed days are
excluded rather than partially counted.

Staleness is stored, not derived. Any write to a meal — edit, delete, or a late
addition — marks the review at `weekStart(meal.date)` stale in the same
operation. Deriving it instead by comparing timestamps looks tidier but breaks
on deletion: removing the most recently edited meal lowers the week's maximum
`updated_at` and the review silently becomes fresh again. One stored boolean
written by the same code that made the change has no such hole.

`lib/dates.ts` supplies `monthGridDates`, `todayISO`, `addDays`, `monthOf`,
`addMonths`, `formatLongDate` and `WEEKDAYS_SHORT` unchanged. No new date maths
is written for the grid.

## 6. The estimator

One route handler, `src/app/api/meals/estimate/route.ts`, serving both input
shapes. Read the current App Router guide in `node_modules/next/dist/docs/`
before writing it — Next.js 16's route handler signature is not the one in
training data.

**Request.** Either `{ image: <base64 webp>, slot }` or `{ text: string, slot }`.
A photographed meal sends the 800px version, not the original.

**Response.**

```ts
interface Estimate {
  dish: string;
  detail: string;
  calories: number;
  confidence: 'high' | 'medium' | 'low';
}
```

**The call.** Package `@google/genai`, client `new GoogleGenAI({})`, model
`gemini-3.7-flash`, via `client.interactions.create({ model, input,
response_format })` with `response_format: { type: 'text', mime_type:
'application/json', schema }`. Verified against Google's current documentation
on 2026-08-23; the SDK surface has changed from earlier versions, so re-check
the image-input part shape at implementation time rather than assuming the
`generateContent` form.

Flash is the correct tier — this is a contained reading task, and latency at the
camera matters more than depth.

**The prompt** states that the subject is Malaysian home and hawker food and
names the categories the model should expect to see (nasi lemak, economy rice,
chap fan, kolo mee, chicken rice, hotpot). It instructs the model to judge
portion against the plate and commit to a single number rather than hedge into
a range, and to return `low` confidence honestly when the image is too dark,
too partial, or not food. Low confidence is a supported outcome, not a failure.

**The key** is read from `process.env.GEMINI_API_KEY` inside this handler only.

**Cost and data use.** At six meals a day across two people this is a trivial
volume. Google's pricing page carries a per-model row reading "Used to improve
our products — Free tier: Yes, Paid tier: No", so free-tier photos are used by
Google for product improvement and paid-tier photos are not. This is a billing
setting on the same key and changes nothing in code. Flagged for a deliberate
choice; the exact per-token figures could not be read cleanly from the pricing
page and should be confirmed before enabling billing.

## 7. The weekly review

A second handler, `src/app/api/meals/review/route.ts`, text only — no images,
so it costs a fraction of the estimator and returns in a couple of seconds.

It receives that person's sealed days for the week: dish names, slots,
calories, dates. Two things in the prompt matter more than they look.

**The sealed-day count is stated explicitly.** Given three sealed days, the
model is told it is looking at three days and instructed to write about them as
such. Without this it describes a full week it has barely seen.

**Specificity is required and generic filler is forbidden.** The model is
instructed to name changes anchored to what was actually eaten — "dinners
average 900 kcal against 400 at lunch; move some of the rice earlier" — and
explicitly told not to produce eat-more-vegetables advice. It is scoped to food
swaps, portions and timing, and told not to set targets or make claims about
health, both of which it has no basis for.

The body is stored in `meal_reviews` against that week and person. Pressing the
button on an unchanged week returns the stored copy without a network call.

## 8. Components

New directory `src/components/meals/`, following the shape of
`src/components/calendar/`. The existing calendar components are not reused —
they are built around events, categories, owners and multi-day spans, and
bending them to hold photographs would make both harder to read. The date maths
in `lib/dates.ts` *is* reused.

**`MealsBoard.tsx`** — the page body. Owns the month cursor and the fetched
data, renders the three stacked pieces below.

**`WeekCard.tsx`** — both people's running totals for the current week, seven
small bars beneath, and the Review button (label switching between "Review my
week", "Refresh" and the stored-review state).

**`UnfinishedDayCard.tsx`** — appears above the grid when the previous food day
is unsealed and the clock has passed 08:00. Names what is missing, offers the
gap-fill entry, and offers Seal.

**`MealMonthGrid.tsx`** — seven columns via `monthGridDates`. A day with photos
shows its first thumbnail filling the square; the date number sits in a small
solid chip in the corner rather than over the image. Today carries a ring.
Empty days are plain.

**`CameraButton.tsx`** — fixed at the bottom, thumb-height, at least 44px.
Wraps `<input type="file" accept="image/*" capture="environment">`, which is
more reliable across iOS and Android than `getUserMedia` and gives the native
camera UI for free.

**`ConfirmCard.tsx`** — dish, detail, calories, and the Smaller / Normal /
Larger buttons with a free-text override. When `needsManualEntry` is true the
layout flips: the "I can't tell what this is" message and the text field come
first, and no number is offered for thoughtless acceptance.

**`DayStory.tsx`** — the full-screen sheet. `formatLongDate` across the top,
both totals beneath it, then the day's meals from `storyOrder` with each photo
large and captioned by time, person and dish. Tapping a meal opens editing.

**`MealEditor.tsx`** — change dish, calories, slot; delete. Editing never
re-runs the estimator; the user is overruling it, not asking again. Any edit
inside a reviewed week marks that review stale.

`/meals` already sits in the drawer via `navLinks.ts`. No nav changes.

## 9. Colours and contrast

The meals accent is `#D9AC80`, pinned in `accents.test.ts`. `PageShell` sets it
as `--mt-accent` on `<main>`, so nothing needs prop drilling.

`#D9AC80` is a pastel built to sit behind text. It is used for surfaces, chips
and the empty-square tint only. Where the week bars need it as ink it fails
contrast and requires a deeper sibling, following the existing
`--mac-chart-lilac` and `--mac-danger-deep` pattern.

The photographs create one genuinely new contrast problem: they are arbitrary
images, and no text can be verified against them. So no text is drawn onto a
photo anywhere. The grid's date number sits in a solid chip; the story's
captions sit beneath each photo on the page background, not over it. This is
the wallpaper rule from `CLAUDE.md` applied to user content — if it has words,
it sits on a panel.

`/meals` is in the `(life)` group and renders `data-mood="light"` on a `plain`
background field. No change to `backgroundFieldFor`.

## 10. Errors and offline

**No signal at capture.** The photo is resized and written to Dexie, appears
immediately in today's square marked as waiting, and uploads when connectivity
returns. Capture never depends on the network.

**Gemini unreachable or out of quota.** Indistinguishable from no signal as far
as the app is concerned. The meal exists with no calories and shows "tap to
estimate". Nothing is lost and nothing blocks.

**The photo is not food.** Returns low confidence; `ConfirmCard` flips as
described in §8. The photo can be discarded from that card.

**The estimate is simply wrong.** Undetectable by any automatic means. This is
the entire justification for the confirm step, and the reason §7's review reads
patterns rather than reciting exact totals.

**Both phones at once.** Each person has their own `meal_days` row, so seals
cannot collide. Two entries at the same minute order by insertion. With two
users this needs no further thought.

Exceptions are caught in the upload path, the Dexie access and the two route
handlers, because storage, IndexedDB and the network genuinely fail. The pure
functions in §5 do not catch anything.

## 11. Testing

Beside their sources, as `*.test.ts`.

**`mealDay.test.ts`** — 01:00 returns the previous date; 07:00 returns today;
04:00 exactly starts the new day; `slotForTime` covers all four bands and both
sides of every boundary; a day with breakfast and lunch is not complete; a day
with three meals plus two snacks is; `dayTotal` ignores nothing and
double-counts nothing.

**`mealEstimate.test.ts`** — pins `PORTION_SMALLER` at 0.7 and `PORTION_LARGER`
at 1.4; `normal` returns the input unchanged; scaling rounds to a whole number;
`needsManualEntry` is true only for low confidence.

**`mealStory.test.ts`** — two people's meals interleave by time rather than
grouping by person; a typed entry with no time lands at its slot's nominal
position, not at the start; breakfast never sorts after dinner; a day with one
meal returns it.

**`mealWeek.test.ts`** — weeks start Monday; a Sunday date resolves to the
Monday six days earlier, not the next day; `weekDates` returns seven; unsealed
days contribute zero to totals; a week with three sealed days reports
`sealedCount` three.

The camera, the resize, the upload and both Gemini calls are not unit-tested —
there is no DOM and no network in the Vitest setup. They are covered by the
verification checklist written alongside this spec, exercised on a real phone
against the deployed host.

When fixing a bug found later, the test goes in first and must fail against the
bug.

## 12. Accepted risks and out of scope

### Accepted

**Photo and data exposure.** `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships in the
browser bundle, and every table's policy is `using (true)`. Anyone who reaches
the public URL can read that key from the page source and query the database
directly, including meal photos, calorie history, calendar, cycle and timetable
data. `Gatekeeper` hides the app's screens; it does not sit between anyone and
Supabase. This was raised during design with the option of either scoping photo
access behind a server route or moving the whole app to real Supabase Auth, and
was declined as not worth the effort for food photos. Recorded so the decision
is visible rather than forgotten. The mitigations that cost nothing are
applied: unguessable filenames and a non-listable bucket.

**Free-tier data use.** If the Gemini key stays on the free tier, submitted
photos are used by Google to improve their products, covering both people's
meals. A billing setting, not a code change.

### Out of scope

**Push notifications.** The 8am nudge is an in-app card. Real notifications
need a service worker, per-device subscriptions, a scheduled sender and
per-device permission, and on iOS require a home-screen install. Deferred as
its own piece of work; `UnfinishedDayCard` is designed so a push can later drive
the same card without rework.

**A daily calorie target.** The review works from patterns. If its advice reads
as too vague after real use, a per-person target is a small addition — one
column, one field, one extra line in the prompt.

**Calories burnt.** `/fitness` will subtract burnt from eaten. `intakeFor` in
`lib/mealDay.ts` is the seam it will call. Nothing else here anticipates it.

**Recipes, meal planning, shopping lists, restaurant lookup, barcode scanning,
macronutrients.** None were requested.

**Deployment.** §3 names it as a prerequisite. Connecting the repo to Vercel is
its own small task, not part of this build.

## 13. Build order

Both features ship, but not simultaneously. The story is built end to end
first, and the calorie half is layered onto working photos afterwards.

1. **`lib/` first.** `mealDay`, `mealStory`, `mealWeek` and `mealEstimate` with
   their tests, before any component. They are pure, they are the contract every
   component reads, and they are the only part Vitest can see.
2. **Storage and capture.** The Dexie table, the two-size resize, the bucket
   upload, and `CameraButton`. Ends when a photo taken on a phone appears in
   Supabase.
3. **The story.** `MealMonthGrid` and `DayStory`. Ends when a day tapped on
   either phone shows both people's photos in one timeline. Feature 1 is now
   complete and usable on its own.
4. **The estimator.** The route handler, `ConfirmCard`, `MealEditor`, and
   calories on the entries.
5. **Days and weeks.** Sealing, `UnfinishedDayCard`, `WeekCard`, and the
   review handler.

The ordering is not arbitrary. The photo habit is what makes the app worth
opening, and the calorie tracking is worthless without it — if the habit does
not survive a few weeks, that is far cheaper to discover after step 3 than
after step 5. Steps 1–3 also have no external dependency beyond Supabase, so
they can be built and verified before the Gemini key exists.
