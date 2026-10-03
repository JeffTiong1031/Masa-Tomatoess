-- Personal finance — schema
-- Run in the Supabase SQL editor. The app never creates tables.
--
-- Each person has their own categories, entries, quick templates and budget
-- (Jeff does not see Rachel's rows). Like every other room, `owner` is a name
-- badge, not a lock: the policies below let the app's anon key read and
-- write every row, and the app filters by owner.
--
-- Money is stored as whole sen (RM 12.00 is 1200), never as a decimal.
--
-- A Saving entry (period_start set) also stores budget_sen, the budget its
-- period closed with, so it can be recalculated when an older expense is
-- added, edited or deleted.

create table finance_categories (
  id          uuid primary key default gen_random_uuid(),
  owner       text not null check (owner in ('Jeff', 'Rachel')),
  kind        text not null check (kind in ('expense', 'income')),
  name        text not null check (length(trim(name)) > 0),
  system      text check (system in ('saving')),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint finance_categories_one_system_each unique (owner, system),
  constraint finance_categories_id_owner_kind unique (id, owner, kind),
  constraint finance_categories_saving_shape
    check (system is null or (kind = 'income' and name = 'Saving' and archived_at is null))
);

create unique index finance_categories_live_name_idx
  on finance_categories (owner, kind, lower(trim(name)))
  where archived_at is null;

create table finance_entries (
  id           uuid primary key default gen_random_uuid(),
  owner        text not null check (owner in ('Jeff', 'Rachel')),
  kind         text not null check (kind in ('expense', 'income')),
  amount_sen   integer not null,
  category_id  uuid not null,
  date         date not null,
  note         text,
  period_start date,
  budget_sen   integer check (budget_sen > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint finance_entries_category
    foreign key (category_id, owner, kind)
    references finance_categories (id, owner, kind),
  constraint finance_entries_one_saving_per_period unique (owner, period_start),
  constraint finance_entries_hand_entries_positive
    check (period_start is not null or amount_sen > 0),
  constraint finance_entries_saving_is_income
    check (period_start is null or kind = 'income'),
  constraint finance_entries_saving_dated_in_period
    check (period_start is null or date >= period_start),
  constraint finance_entries_saving_keeps_its_budget
    check ((period_start is null) = (budget_sen is null))
);

create index finance_entries_owner_date_idx
  on finance_entries (owner, date);

create table finance_templates (
  id          uuid primary key default gen_random_uuid(),
  owner       text not null check (owner in ('Jeff', 'Rachel')),
  kind        text not null check (kind in ('expense', 'income')),
  label       text not null check (length(trim(label)) > 0),
  amount_sen  integer not null check (amount_sen > 0),
  category_id uuid not null,
  created_at  timestamptz not null default now(),

  constraint finance_templates_category
    foreign key (category_id, owner, kind)
    references finance_categories (id, owner, kind)
);

create index finance_templates_owner_idx
  on finance_templates (owner);

create table finance_budgets (
  owner           text primary key check (owner in ('Jeff', 'Rachel')),
  amount_sen      integer not null check (amount_sen > 0),
  period          text not null check (period in ('week', 'month')),
  anchor          date not null,
  next_period     text check (next_period in ('week', 'month')),
  next_from       date,
  next_amount_sen integer check (next_amount_sen > 0),
  updated_at      timestamptz not null default now(),

  constraint finance_budgets_next_together
    check (
      (next_period is null) = (next_from is null)
      and (next_period is null) = (next_amount_sen is null)
    ),
  constraint finance_budgets_next_is_a_switch
    check (next_period is null or next_period <> period),
  constraint finance_budgets_next_after_anchor
    check (next_from is null or next_from > anchor)
);

alter table finance_categories enable row level security;
alter table finance_entries enable row level security;
alter table finance_templates enable row level security;
alter table finance_budgets enable row level security;

create policy "anon reads finance_categories"
  on finance_categories for select to anon using (true);
create policy "anon writes finance_categories"
  on finance_categories for all to anon using (true) with check (true);

create policy "anon reads finance_entries"
  on finance_entries for select to anon using (true);
create policy "anon writes finance_entries"
  on finance_entries for all to anon using (true) with check (true);

create policy "anon reads finance_templates"
  on finance_templates for select to anon using (true);
create policy "anon writes finance_templates"
  on finance_templates for all to anon using (true) with check (true);

create policy "anon reads finance_budgets"
  on finance_budgets for select to anon using (true);
create policy "anon writes finance_budgets"
  on finance_budgets for all to anon using (true) with check (true);
