alter table todos add column sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by owner
      order by
        due_date nulls last,
        due_time nulls last,
        priority desc,
        created_at asc
    ) * 100 as new_order
  from todos
)
update todos
set sort_order = ranked.new_order
from ranked
where todos.id = ranked.id;

alter table todos drop column priority;
