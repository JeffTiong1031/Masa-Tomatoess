create table notes (
  id          uuid primary key default gen_random_uuid(),
  owner       text not null check (owner in ('Jeff', 'Rachel')),
  title       text not null check (length(trim(title)) > 0),
  body        text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notes_owner_sort_idx on notes (owner, sort_order);

alter table notes enable row level security;

create policy "anon reads notes"
  on notes for select to anon using (true);
create policy "anon writes notes"
  on notes for all to anon using (true) with check (true);
