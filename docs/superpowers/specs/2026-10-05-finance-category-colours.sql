-- Finance category colours
-- Run in the Supabase SQL editor. Safe to run before or after the app update:
-- it only adds, and older app code never reads the new column.
--
-- Finance gets its own colour palette in colour_swatches (kind 'finance'),
-- seeded with the same eight starting colours as Timetable and Calendar.
-- Each category points at one swatch through swatch_id. Saving keeps
-- swatch_id empty: the app paints it a fixed colour.
--
-- Existing categories are given a colour each, in the order they were made,
-- so nobody opens Finance to a list of grey dots.

alter table colour_swatches drop constraint colour_swatches_kind_check;
alter table colour_swatches
  add constraint colour_swatches_kind_check
  check (kind in ('timetable', 'calendar', 'finance'));

alter table finance_categories
  add column if not exists swatch_id uuid
  references colour_swatches (id) on delete set null;

alter table finance_categories
  add constraint finance_categories_saving_unpainted
  check (system is null or swatch_id is null);

insert into colour_swatches (owner, kind, fill, text_color, position)
select people.owner, 'finance', starter.fill, null, starter.position
from (values ('Jeff'), ('Rachel')) as people (owner)
cross join (
  values
    ('#B83A3A', 0),
    ('#A05A12', 1),
    ('#4F7A2A', 2),
    ('#17706A', 3),
    ('#2C5FA8', 4),
    ('#5B3FA0', 5),
    ('#A63478', 6),
    ('#5A5560', 7)
) as starter (fill, position)
where not exists (
  select 1 from colour_swatches existing
  where existing.owner = people.owner and existing.kind = 'finance'
);

with numbered as (
  select
    id,
    owner,
    (row_number() over (partition by owner order by created_at) - 1) % 8 as slot
  from finance_categories
  where system is null and swatch_id is null
)
update finance_categories category
set swatch_id = swatch.id
from numbered
join colour_swatches swatch
  on swatch.owner = numbered.owner
  and swatch.kind = 'finance'
  and swatch.position = numbered.slot
where category.id = numbered.id;
