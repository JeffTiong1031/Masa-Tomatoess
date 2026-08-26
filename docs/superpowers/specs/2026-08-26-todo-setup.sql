create table todos (
  id           uuid primary key default gen_random_uuid(),
  owner        text not null check (owner in ('Jeff', 'Rachel')),
  title        text not null check (length(trim(title)) > 0),
  due_date     date,
  due_time     time,
  priority     boolean not null default false,
  done         boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint todos_time_needs_date
    check (due_date is not null or due_time is null),
  constraint todos_completed_at_matches_done
    check (done = (completed_at is not null))
);

create index todos_owner_open_idx on todos (owner, due_date) where not done;
create index todos_owner_done_idx on todos (owner, completed_at desc) where done;

alter table todos enable row level security;

create policy "anon reads todos"
  on todos for select to anon using (true);
create policy "anon writes todos"
  on todos for all to anon using (true) with check (true);
