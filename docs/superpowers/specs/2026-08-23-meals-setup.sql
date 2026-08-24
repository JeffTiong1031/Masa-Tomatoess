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
