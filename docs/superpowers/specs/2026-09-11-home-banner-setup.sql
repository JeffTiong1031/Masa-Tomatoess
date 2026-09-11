-- Home page rotating banner: which dates are starred into the banner.
-- Run once in the Supabase SQL editor. Re-running is harmless.

alter table calendar_events  add column if not exists pinned boolean not null default false;
alter table count_up_entries add column if not exists pinned boolean not null default false;
