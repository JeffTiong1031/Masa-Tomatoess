-- Timetable and timeline — schema
-- Design: 2026-09-03-timetable-recurring-design.md
-- Run this in the Supabase SQL editor. The app never creates tables.

-- ---------------------------------------------------------------------------
-- 1. Recurring events — the timetable grid's only content (D80, D81)
-- ---------------------------------------------------------------------------

create table timetable_rules (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = Monday
  title      text not null,
  start_time time not null,
  end_time   time not null,
  swatch     smallint not null check (swatch between 1 and 8),
  created_at timestamptz not null default now(),
  check (end_time > start_time)                                  -- D96
);

create index timetable_rules_owner_weekday_idx
  on timetable_rules (owner, weekday);

alter table timetable_rules enable row level security;

create policy "anon reads timetable_rules"
  on timetable_rules for select to anon using (true);

create policy "anon inserts timetable_rules"
  on timetable_rules for insert to anon with check (true);

create policy "anon updates timetable_rules"
  on timetable_rules for update to anon using (true) with check (true);

create policy "anon deletes timetable_rules"
  on timetable_rules for delete to anon using (true);


-- ---------------------------------------------------------------------------
-- 2. The timeline — one document per person per weekday (D93)
--
-- WARNING: this drops the two existing rows. They mean "tomorrow", which is not
-- a weekday the app can name, so there is nothing to migrate them to. Copy the
-- text out first if you want to keep it.
-- ---------------------------------------------------------------------------

drop table if exists timetables;

create table timetables (
  user_name  text not null,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = Monday
  entries    jsonb not null default '[]' check (jsonb_typeof(entries) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (user_name, weekday)
);

alter table timetables enable row level security;

create policy "anon reads timetables"
  on timetables for select to anon using (true);

create policy "anon inserts timetables"
  on timetables for insert to anon with check (true);

create policy "anon updates timetables"
  on timetables for update to anon using (true) with check (true);

create policy "anon deletes timetables"
  on timetables for delete to anon using (true);
