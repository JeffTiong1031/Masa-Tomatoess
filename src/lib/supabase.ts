import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
Supabase Schema for focus_sessions:

```sql
create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  duration_minutes integer not null, -- CHECK (duration_minutes > 0 AND duration_minutes <= 1440)
  task_name text,
  created_at timestamptz default now()
);
```

Supabase Schema for timetables (one row per person, replaced whole on save):

```sql
create table timetables (
  user_name  text primary key,
  entries    jsonb not null default '[]' check (jsonb_typeof(entries) = 'array'),
  updated_at timestamptz not null default now()
);

alter table timetables enable row level security;

create policy "anon reads timetables"
  on timetables for select to anon using (true);

create policy "anon inserts timetables"
  on timetables for insert to anon with check (true);

create policy "anon updates timetables"
  on timetables for update to anon using (true) with check (true);
```

Supabase schema for cycle tracking (cycle spec §3). No user_name column:
there is one cycle being tracked, and both people read the same rows.

```sql
create table cycle_periods (
  id         uuid primary key default gen_random_uuid(),
  start_date date not null unique,
  end_date   date,
  updated_at timestamptz not null default now(),
  constraint cycle_periods_end_after_start
    check (end_date is null or end_date >= start_date)
);

create table cycle_symptoms (
  date       date primary key,
  symptoms   jsonb not null default '[]'
             check (jsonb_typeof(symptoms) = 'array'),
  updated_at timestamptz not null default now()
);

alter table cycle_periods enable row level security;
alter table cycle_symptoms enable row level security;

create policy "anon reads cycle_periods"
  on cycle_periods for select to anon using (true);
create policy "anon writes cycle_periods"
  on cycle_periods for all to anon using (true) with check (true);

create policy "anon reads cycle_symptoms"
  on cycle_symptoms for select to anon using (true);
create policy "anon writes cycle_symptoms"
  on cycle_symptoms for all to anon using (true) with check (true);
```
*/
