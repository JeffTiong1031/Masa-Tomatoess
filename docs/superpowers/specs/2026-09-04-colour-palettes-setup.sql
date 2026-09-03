-- Personal colour palettes — schema
-- Design: 2026-09-04-personal-colour-palettes-design.md
-- Run in the Supabase SQL editor. The app never creates tables.
--
-- Part 1 — safe: new table.
-- Part 2 — alters timetable_rules and calendar categories; run when the
--          new code is ready. Keeps legacy `swatch` until the app has
--          migrated rows; Part 3 drops legacy columns.

-- Part 1
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

-- Part 2 (timetable_rules + categories — adjust category table name to match repo)
alter table timetable_rules
  add column if not exists swatch_id uuid,
  add column if not exists text_override text;

-- calendar categories table: confirm name in calendarRepo (likely calendar_categories)
alter table calendar_categories
  add column if not exists swatch_id uuid;

-- Part 3 (after client migration has filled swatch_id)
-- alter table timetable_rules drop column swatch;
-- alter table timetable_rules alter column swatch_id set not null;
-- alter table calendar_categories drop column swatch;
-- alter table calendar_categories alter column swatch_id set not null;
