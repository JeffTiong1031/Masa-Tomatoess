# Personal colour palettes — verification

Date: 2026-09-04
Branch: `feat/personal-colour-palettes`
Plan: `docs/superpowers/plans/2026-09-04-personal-colour-palettes.md`
Spec: `docs/superpowers/specs/2026-09-04-personal-colour-palettes-design.md`
SQL: `docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql`

Jeff runs this on the live app (or a preview with real Supabase). The app never
creates tables. Task 12 fills in pass/fail after the clicks.

## SQL order (do this first)

1. **Part 1** — create `colour_swatches`. Safe any time.
2. Deploy this branch (or run it locally with the same database).
3. **Part 2** — add `swatch_id` / `text_override`, make old `swatch` nullable.
4. Open **Timetable** and **Calendar** once while signed in. That copies old
   colours 1–8 onto `swatch_id`.
5. **Part 3** — drop old `swatch`. Only after step 4. See the WARNING in the
   SQL file.

Do not paste the whole SQL file in one go.

## What to click

Signed in as Jeff unless a row says otherwise. Use a phone-width check on the
colour row (targets at least 44px).

| # | Check |
|---|---|
| 1 | Timetable Add: your colours plus Add. Add a custom fill and text. The preview card matches title + time + those colours. Save. The grid block looks the same. |
| 2 | Edit that class, change only the text colour. Choose **Just this event**. Other classes that use the same colour keep the old text. |
| 3 | Edit another class on the same colour, change text, choose **Update colour for all**. Those classes pick up the new text; the one with “just this” stays overridden. |
| 4 | Delete a colour that a class still uses → refused, with a clear reason. Delete an unused colour → it goes. |
| 5 | Switch to Rachel’s timetable. Jeff’s fills (and text) still show. No Add / delete / edit on the colour row. |
| 6 | Calendar categories: your calendar colours plus Add. Add is fill only — no text picker, no preview card. Events and chips use that fill. |
| 7 | Delete a calendar colour still used by a category → refused. Unused delete works. |
| 8 | Optional: delete unused starters until none remain. Saving a new class / category that needs a colour is blocked until you add one. |
| 9 | After SQL is in place, the console has no failed Supabase calls for palettes, rules, or categories. |

Leave Result empty until Task 12 (browser pass).
