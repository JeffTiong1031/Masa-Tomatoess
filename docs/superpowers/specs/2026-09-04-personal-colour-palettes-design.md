# Personal colour palettes — design

**Date:** 2026-09-04
**Status:** Awaiting review
**Touches:** Timetable recurring events; Calendar categories
**Builds on:** [2026-09-03-timetable-recurring-design.md](2026-09-03-timetable-recurring-design.md) (especially **D83**)

## 1. Context

Today both the timetable grid and the calendar use a fixed set of eight
swatches (`1`–`8`), shared by Jeff and Rachel, stored as a number on the
rule or category. You cannot add a colour, delete one, or choose the
text colour on a block.

This spec replaces that with **personal palettes**: each person builds
their own colours, and timetable colours stay separate from calendar
colours.

### What this reverses, and what it does not

| Earlier decision | Now |
|---|---|
| **D83** — a rule stores a swatch index 1–8, not a category row | **Reversed for colour identity.** A rule (and a calendar category) stores a **swatch id** that points at a row in that owner's palette for that feature. Colour is still not a named "category" on the timetable; it is a reusable personal swatch. |
| Fixed eight `--mt-tag-*` fills for user content | **Holds for chrome and starters.** Starter swatches are seeded from those fills. User-added fills are stored as hex (user data), not as new CSS tokens. |
| White text on every timetable block | **Relaxed.** Timetable swatches carry a default text colour (starts white); an event may override it. Calendar keeps the app's normal text styling — fill only. |

## 2. Decisions

Numbering continues from the timetable recurring spec (which ended at D96).

| # | Decision | Rationale |
|---|---|---|
| **D97** | Each person has **two palettes**: one for **timetable**, one for **calendar**. Jeff's timetable palette ≠ Jeff's calendar palette ≠ Rachel's either. | User decision. The two features paint different surfaces and must not steal each other's colours. |
| **D98** | Palettes are **not shared between people**. Rachel never edits Jeff's swatches; she still **sees** his real fills (and timetable text) when viewing his board. | User decision (partner sees real colours; ownership stays per person). |
| **D99** | A new palette is **seeded with a few starter swatches** (the current eight tag fills). The owner may delete them once nothing uses them, and may add custom ones. | User decision — not blank forever; blank only if they clear what they own. |
| **D100** | **Timetable** swatches store **fill + text colour**. Text defaults to **white** when adding a colour; the user can change it. | User decision. Blocks carry words; pale fills need dark text. |
| **D101** | **Calendar** swatches store **fill only**. No text colour picker, no preview card on the calendar colour flow. | User decision. Calendar already sits text on panels; only the colour chip / event tint needs the fill. |
| **D102** | Adding a colour uses a **square + hue bar** colour picker (no eyedropper). | User decision, matching the reference UI they showed. |
| **D103** | On the **timetable** Add/Edit recurring event sheet, choosing or editing colour shows a **live preview card** (title + time) that updates as fill and text change. | User decision — confirm before save what the block will look like. |
| **D104** | Deleting a swatch that is still used by that owner's rules or categories is **refused**, with a message that makes the usage clear. | User decision. Avoids silent recolour or orphaned ids. |
| **D105** | Timetable text colour lives on the **swatch as default**, and may be **overridden on one event**. Changing text while editing an event **asks**: Just this event / Update colour for all / Cancel. | User decision. "Update all" updates the swatch default and clears overrides that still matched the old default. "Just this" writes only the event override. |
| **D106** | Existing `swatch` values `1`–`8` are **migrated once** onto the matching starter swatch id in that owner's palette for that feature. After migration, the app only stores swatch ids (plus optional timetable text override). | Keeps current classes and categories looking the same on first load after the change. |
| **D107** | If the owner's palette for that feature has **no swatches left**, Save on a new/edited item that needs a colour is **blocked** until they add one. | Starters usually prevent this; this is the floor after aggressive deletes. |
| **D108** | User-chosen fills and text colours are stored as **hex strings** in Supabase. Components must not invent new `--mac-*` tokens for user colours. App chrome still uses `--mt-*` tokens. | User colours are data. Tokens are for the product palette. Contrast for custom pairs is the user's choice (text is editable); starters remain pinned by existing swatch tests. |

## 3. What you see

### Timetable — Add / Edit recurring event

1. Colour row shows **your** timetable swatches + an **Add** control.
2. **Add** opens a sheet: fill picker, text colour (starts white), **preview card** below that follows the draft title/time and the chosen fill/text.
3. Confirm adds the swatch to your timetable palette and selects it for this event.
4. Selecting an existing swatch paints the preview (and the eventual block) from that swatch, unless this event has a text override.
5. Editing text colour on an event that already uses a swatch prompts **Just this event** / **Update colour for all** / Cancel.
6. Delete on a swatch you own: if any of your rules still point at it, refuse; otherwise remove it from your palette.

Rachel's timetable: same paints, no Add / delete / edit on the palette.

### Calendar — category colour

1. Colour row shows **your** calendar swatches + **Add**.
2. **Add** opens fill picker only (no text, no preview card).
3. Delete refused while any of your categories still use that swatch.

## 4. Data model

### Supabase

Jeff runs the SQL himself; the app never creates tables. Prefer **one table**
with a `kind` so both features share one repo shape:

```sql
create table colour_swatches (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  kind       text not null check (kind in ('timetable', 'calendar')),
  fill       text not null,                          -- #RRGGBB
  text_color text,                                   -- #RRGGBB; required for timetable, null for calendar
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

create index colour_swatches_owner_kind_idx
  on colour_swatches (owner, kind);
```

Row-level policies match the rest of the app (anon read/write for this
two-person deployment), documented beside the other schemas in
`src/lib/supabase.ts`.

### Timetable rules

- Replace `swatch smallint` with `swatch_id uuid not null` referencing
  `colour_swatches(id)` (or keep the uuid without a DB FK if the project
  prefers soft links — the app enforces ownership and kind).
- Add nullable `text_override text` (`#RRGGBB` or null).

### Calendar categories

- Replace `swatch smallint` with `swatch_id uuid not null` pointing at a
  `kind = 'calendar'` row for that owner.

### Seeding and migration

On first load for an owner+kind with zero rows: insert the starter set
(current eight tag fills; timetable starters also get `text_color = #FFFFFF`).

Migration of legacy `1`–`8`: map index N to the Nth starter for that
owner+kind, then rewrite rule/category rows to `swatch_id`. Run as a
one-shot path in app code after seed, or as SQL Jeff runs once — the
implementation plan picks one and documents it; behaviour is the same.

## 5. Behaviour details

| Situation | Behaviour |
|---|---|
| Partner views your grid / calendar | Sees your fill (and timetable text / override). Cannot mutate your palette. |
| Delete swatch in use | Refuse; message indicates it is still used. |
| Update colour for all (timetable text) | Set swatch `text_color`; clear `text_override` on your rules that still equalled the previous default. |
| Just this event | Set `text_override` on that rule only. |
| Empty palette | Cannot save a colour-requiring item until at least one swatch exists. |
| Calendar fill change on a swatch | All categories using that swatch show the new fill; no text path. |

## 6. Testing

Vitest, pure functions only (existing project rule):

- Starter seed shape (count, fills, timetable text white, calendar text null).
- Legacy `1`–`8` → starter id mapping.
- Delete allowed / refused given an "in use" set.
- Resolve paint: swatch default vs `text_override`.
- "Update all" clears matching overrides; "just this" does not change the swatch.

Browser verification (after implement): timetable preview card; calendar add fill without text/preview; Rachel read-only palette; delete refuse when in use.

## 7. Out of scope

- Eyedropper.
- Shared / couple-wide palette.
- Named colour labels ("Maths red").
- Auto-darkening fills (user picks text instead).
- Syncing a timetable swatch into the calendar palette or the reverse.
- Offline / Dexie copy of palettes (same online-only stance as timetable rules).

## 8. Open implementation choices (not product decisions)

These do not change what Jeff sees; the plan may pick either:

- Hard `REFERENCES colour_swatches(id)` vs soft uuid + app checks.
- Seed/migrate in SQL vs first-fetch in the client.
- Exact starter list: keep all eight current tags vs a shorter subset (product default: **all eight**).
