-- Personal Count Up dates — schema
-- Run in the Supabase SQL editor. The app never creates tables.
--
-- Each person has their own list (Jeff does not see Rachel's rows).
-- These are not calendar events.
--
-- count_up_state records that a person has already started a list, so
-- deleting the last date does not put Together back on the next visit.

create table count_up_entries (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null check (owner in ('Jeff', 'Rachel')),
  label      text not null check (length(trim(label)) > 0),
  date       date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index count_up_entries_owner_date_idx
  on count_up_entries (owner, date);

alter table count_up_entries enable row level security;

create policy "anon reads count_up_entries"
  on count_up_entries for select to anon using (true);
create policy "anon writes count_up_entries"
  on count_up_entries for all to anon using (true) with check (true);

create table count_up_state (
  owner          text primary key check (owner in ('Jeff', 'Rachel')),
  initialized_at timestamptz not null default now()
);

alter table count_up_state enable row level security;

create policy "anon reads count_up_state"
  on count_up_state for select to anon using (true);
create policy "anon writes count_up_state"
  on count_up_state for all to anon using (true) with check (true);
