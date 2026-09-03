-- Personal colour palettes — schema
-- Design: 2026-09-04-personal-colour-palettes-design.md
-- Run in the Supabase SQL editor. The app never creates tables.
--
-- The three parts run at DIFFERENT TIMES. Do not paste the whole file at once.
--
--   Part 1  Safe now. Creates colour_swatches. Nothing reads it yet.
--
--   Part 2  Run when the new app code is ready to deploy. Adds swatch_id
--           (and timetable text_override) beside the old swatch number, and
--           makes that old column nullable so new inserts can omit it.
--
--   Part 3  WARNING — destructive. Run only after the new code is live and
--           you have opened Timetable and Calendar once (the app copies old
--           colours 1–8 onto swatch_id). Then drop the legacy swatch column.
--           If any row still has a blank swatch_id, Part 3 will fail — that
--           is the safety net; open the app again and retry.
--
-- Order for Jeff:
--   1. Run Part 1.
--   2. Deploy / start the new app, then run Part 2.
--   3. Use the app (open Timetable and Calendar) so rows migrate.
--   4. Run Part 3.

-- ---------------------------------------------------------------------------
-- Part 1 — create table
-- ---------------------------------------------------------------------------

create table colour_swatches (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  kind       text not null check (kind in ('timetable', 'calendar')),
  fill       text not null,
  text_color text,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

create index colour_swatches_owner_kind_idx
  on colour_swatches (owner, kind);

alter table colour_swatches enable row level security;

create policy "anon reads colour_swatches"
  on colour_swatches for select to anon using (true);
create policy "anon inserts colour_swatches"
  on colour_swatches for insert to anon with check (true);
create policy "anon updates colour_swatches"
  on colour_swatches for update to anon using (true) with check (true);
create policy "anon deletes colour_swatches"
  on colour_swatches for delete to anon using (true);

-- ---------------------------------------------------------------------------
-- Part 2 — add swatch_id (and text_override); make legacy swatch nullable
-- ---------------------------------------------------------------------------

alter table timetable_rules
  add column if not exists swatch_id uuid,
  add column if not exists text_override text;

alter table timetable_rules
  alter column swatch drop not null;

alter table calendar_categories
  add column if not exists swatch_id uuid;

alter table calendar_categories
  alter column swatch drop not null;

-- ---------------------------------------------------------------------------
-- Part 3 — drop legacy swatch AFTER client migration
--
-- WARNING: run this only after Part 1, Part 2, a code deploy, and at least
-- one open of Timetable and Calendar so every class and category has a
-- swatch_id. This deletes the old 1–8 colour number. It cannot be undone
-- from this file.
--
-- Optional check first (both should return 0):
--   select count(*) from timetable_rules where swatch_id is null;
--   select count(*) from calendar_categories where swatch_id is null;
-- ---------------------------------------------------------------------------

alter table timetable_rules drop column swatch;
alter table timetable_rules alter column swatch_id set not null;

alter table calendar_categories drop column swatch;
alter table calendar_categories alter column swatch_id set not null;
