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
  duration_minutes integer not null,
  task_name text,
  created_at timestamptz default now()
);
```
*/
