-- Notes files and folders — schema
-- Design: 2026-09-15-notes-files-design.md
-- Run in the Supabase SQL editor. The app never creates tables.
--
-- Safe to run before the new code is deployed. Nothing reads these yet, and
-- the new columns on notes are all nullable, so today's app keeps working
-- exactly as it does now after you run this.
--
-- Paste the whole file at once and press Run.

-- ---------------------------------------------------------------------------
-- Folders
-- ---------------------------------------------------------------------------

create table if not exists note_folders (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null check (owner in ('Jeff', 'Rachel')),
  parent_id  uuid references note_folders (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  colour     text not null check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  position   integer not null default 0,
  bin_group  uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The rail reads one owner's folders ordered by position; the bin reads the
-- same rows filtered the other way. One index serves both.
create index if not exists note_folders_owner_position_idx
  on note_folders (owner, position);

create index if not exists note_folders_parent_idx
  on note_folders (parent_id);

alter table note_folders enable row level security;

-- Dropped first so the whole file can be pasted twice without an error on
-- the second run.
drop policy if exists "anon reads note_folders" on note_folders;
drop policy if exists "anon writes note_folders" on note_folders;

create policy "anon reads note_folders"
  on note_folders for select to anon using (true);
create policy "anon writes note_folders"
  on note_folders for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Notes: which folder, and the bin
-- ---------------------------------------------------------------------------
--
-- folder_id null means "not in a folder", which is where every note that
-- exists today lands. A folder deleted for good releases its notes rather
-- than taking them with it, because the bin sweep deletes the folder row and
-- the notes are restorable on their own.

alter table notes
  add column if not exists folder_id uuid
    references note_folders (id) on delete set null,
  add column if not exists bin_group uuid,
  add column if not exists deleted_at timestamptz;

create index if not exists notes_owner_folder_idx
  on notes (owner, folder_id);

-- There is no "saved" column on purpose. A note that has never been saved is
-- a draft, it lives only on the device that typed it, and the app decides
-- that by whether the row is here at all.
