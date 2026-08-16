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
*/
