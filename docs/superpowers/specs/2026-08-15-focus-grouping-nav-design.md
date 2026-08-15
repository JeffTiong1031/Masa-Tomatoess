# Focus grouping and section navigation — design

**Date:** 2026-08-15
**Status:** Approved
**Builds on:** [2026-08-15-life-hub-macaron-design.md](2026-08-15-life-hub-macaron-design.md)

## 1. Context

The life hub branch (`feat/life-hub-macaron`, unmerged) shipped nine routes: a hub at
`/`, two focus routes, a dashboard, and five life shells. Navigation is a left drawer
plus a four-slot mobile bottom bar (`/`, `/timer`, `/flexible`, `/dashboard`).

Human verification of that branch passed on every check that could be run locally.

This design changes how those routes are *reached*, not what they do. Three existing
routes get grouped behind one Focus destination with an in-page toggle, and the mobile
bottom bar is repurposed to switch between three top-level sections.

Two of those three sections do not exist yet. They ship here as styled shells and are
built for real in later, separate specs.

## 2. Decisions

Numbering continues from the life hub spec (D1–D8 there).

| # | Decision | Rationale |
|---|---|---|
| **D9** | `/timer`, `/flexible` and `/dashboard` keep their URLs. Focus is a shared frame around them, not a replacement route. | Deep links, the browser back button, and Rachel's existing home-screen shortcuts keep working. Nothing verified on the previous branch regresses. |
| **D10** | All three Focus routes render dark. `/dashboard` converts from cream to plum. | A frame whose background flips when you hit the third toggle does not read as one place. Dashboard was dark on `main` before this work, so the layout is proven at dark, and the dark macaron tokens already exist. |
| **D11** | The toggle is a segmented pill at the top of the Focus frame. | Conventional position for a tab switcher. The alternative — making the bottom bar the toggle while inside Focus — was rejected: a bar that silently changes meaning per screen is clever once and confusing daily. |
| **D12** | Mobile bottom bar becomes three slots: Focus, Calendar, Timetable. | These are the app's top-level sections. Home and the Life pages move off the bar. |
| **D13** | **The header does not change.** No Home button is added. Home is reached through the drawer's existing Home entry. Top-right keeps Settings and Theme. | Considered and rejected: a top-right Home button. `/timer` and `/flexible` already have two fixed buttons there, so Home would be a third in a corner already tight enough to have needed a spacing fix — and `/dashboard` has neither, so Home would sit in a different place per route. The drawer already has a Home entry, so this costs nothing and moves nothing. |
| **D14** | Calendar and Timetable ship as inert styled shells, consistent with the five existing Life shells. | Both need new Supabase tables, two-user sync and offline handling. Splitting them out means this change lands on your phones in one session instead of blocking on a much larger build. |
| **D15** | `/countdown` is kept, not absorbed by Calendar. | User decision, made against a recommendation to delete it. To keep the boundary usable, the two are given distinct jobs — see §8. |
| **D16** | `/flexible` keeps the label "Flexible". | User decision. It is a count-up mode the user refers to as a stopwatch; the label stays as-is. |

## 3. Route structure

Route groups do not appear in URLs. Moving a directory between groups changes its
styling and layout, never its address.

```
src/app/
  (focus)/            data-mood="dark"   themeColor #241C22
    layout.tsx        ← renders the Focus pill
    timer/page.tsx        /timer         unchanged
    flexible/page.tsx     /flexible      unchanged
    dashboard/page.tsx    /dashboard     MOVED from (life), converted to dark
  (life)/             data-mood="light"  themeColor #FDF8F3
    layout.tsx
    page.tsx              /              hub
    calendar/page.tsx     /calendar      NEW shell
    timetable/page.tsx    /timetable     NEW shell
    countdown/page.tsx    /countdown     unchanged
    cycle, meals, fitness, finance       unchanged
```

The only file that physically moves is `dashboard/`.

## 4. The Focus frame

`(focus)/layout.tsx` already sets `data-mood="dark"` and exports `viewport`. It gains
the segmented pill. Because the group contains exactly the three Focus routes, the pill
appears on exactly those three screens with no conditional rendering.

**The layout must stay a server component.** It exports `viewport`, which is
server-only. The pill needs `usePathname`, so it is a separate client component
imported into the server layout — the same split used elsewhere in this codebase.

Pill segments are `next/link` navigations between sibling routes sharing a layout.
React keeps the frame mounted across the swap, so toggling is instant and does not
remount the page shell.

**`TimerEngine` stays where it is in `AppShell`, above all route groups.** That
placement is what makes a running timer survive navigation, and it is load-bearing —
`AppShell.tsx` carries a comment saying not to move it. Nothing in this design touches
it.

Active segment styling follows the existing active-nav pattern: accent colour from the
route's own accent token, `aria-current="page"` on the active segment.

**The pill's labels are its own, not `navLinks`'.** Its three segments read **Timer**,
**Flexible**, **Dashboard**. Do not derive them from `ALL_LINKS` — that collection now
labels `/timer` as "Focus" (§5), which would render a pill reading
"Focus / Flexible / Dashboard". The pill needs a small local list of its own.

## 5. Navigation chrome

### Header

**No changes.** Top-left keeps the hamburger; top-right keeps Settings and Theme on the
routes that have them. Getting home is the drawer's Home entry, which already exists.

This is worth stating explicitly because it is a change from an earlier draft of this
design, which added a top-right Home button before checking what was already in that
corner. Nothing in the header should be touched by this work.

The drawer itself is untouched too — focus trap, scroll lock, focus return, all five
close behaviours and the swipe axis check keep working as verified. Only its *contents*
change (below).

### Bottom bar

`BOTTOM_BAR_HREFS` becomes `['/timer', '/calendar', '/timetable']`, labelled **Focus**,
**Calendar**, **Timetable**.

- `AppNav.tsx:29` currently hardcodes `grid-cols-4`. It becomes three columns.
- The module-scope throw guard at `AppNav.tsx:9-13` stays — it catches an href that
  doesn't resolve to a known link at import time.
- The Focus slot points at `/timer` and must read as active on `/timer`, `/flexible`
  **and** `/dashboard`. `isActiveHref` compares against a single href and will not do
  this: the Focus slot needs an explicit "active on any of these three" test.
- On the hub and Life pages no slot is lit. That is correct — you are not in any of the
  three sections.
- The bar remains mobile-only (`useIsMdUp` returns `null` above 768px). Desktop reaches
  everything through the drawer.

### Drawer

The Focus group in `NAV_GROUPS` collapses from three entries to one **Focus** entry
pointing at `/timer`. Calendar and Timetable join the Life group. Result: Home, Focus,
then seven Life entries.

### Hub

`HubGrid` derives its cards from `ALL_LINKS`, so collapsing the drawer group
automatically yields one Focus card instead of three. Calendar and Timetable get cards
marked "Coming soon" via the existing `INERT` set.

Consequence, accepted: starting a timer from the hub becomes two taps rather than one.

## 6. Focus entry point

Focus always opens on `/timer`. There is no memory of the last-used widget — that is
persisted state serving a preference nobody has expressed yet.

If daily use shows Flexible is the common entry, revisit it then.

## 7. Dashboard dark conversion

The highest-risk item here. Everything else is structural; this is perceptual and
cannot be verified by build, lint, or tests.

`(life)/dashboard/page.tsx` moves to `(focus)/dashboard/`, and eight literal colour
sites need re-tuning for plum. Literals are used because Recharts props and the
calendar `theme` prop consume values before CSS custom properties resolve — this is
sanctioned by the life hub spec, not an oversight to fix.

| Line | Current (cream) | Needs |
|---|---|---|
| 26–27 | ramp `['#F3EAE2','#DCC9EC','#BC9FDC','#9670C6','#6E4AA0']` | Dark ramp. Element 0 is the **empty / no-activity** level and must read as "nothing here" against plum, not as a low value. |
| 220 | `colorScheme="light"` | `"dark"` |
| 257, 263 | axis stroke `#796763` | Light-on-dark muted, `#B5A2AC` |
| 270 | cursor fill `#F0E4DA` | Dark hover, `#453640` |
| 272–275 | tooltip `#FFFFFF` / `#F0E4DA` / `#3B2E2A` | `#31262E` / `#453640` / `#F7EFEA` |
| 278 | bar fill `#9670C6` | Lighter on plum, `#C4B0E0` |

**Proposed ramp:** `['#31262E', '#573F63', '#7C5D8E', '#A17FB6', '#C4B0E0']`

**Acceptance criteria — verify, do not assume:**

1. Five levels must be distinguishable side by side. Adjacent contrast ratio ≥ 1.25:1,
   with roughly even CIE-L\* steps. The cream ramp failed its first attempt precisely
   here (deltas of 1.115–1.445 could not convey five levels) and took a rewrite.
2. Element 0 against the card background must read as empty, not as the lowest value.
3. Axis and tooltip text must clear 4.5:1 against their own backgrounds.
4. These are proposed values, not measured ones. Compute the ratios and L\* steps
   before committing, and correct the values if they miss.

## 8. Countdown vs Calendar

Both are kept (D15). To stop them collapsing into "two places for the same date":

- **Countdown** — milestones you count *toward*. Anniversaries, trips, exam dates.
  The interesting quantity is days remaining.
- **Calendar** — events that happen *on* a date, with a time. The interesting quantity
  is when.

Both remain shells here. This boundary matters when Calendar is built for real, and is
recorded now so that spec inherits it.

## 9. Out of scope

Explicitly not in this change:

- Any real Calendar behaviour — event creation, views, recurrence, reminders.
- Any real Timetable behaviour — shared daily plans, two-user editing.
- New Supabase tables, sync, or RLS. Supabase currently syncs one table
  (`focus_sessions`) and is untouched here.
- Last-used-widget memory for Focus (§6).
- Any change to timer, flexible, or hub logic. `hubStats` and the timer stores are not
  touched.

## 10. Verification

Existing tests must stay green — 41 passing across 6 files. This change is structural
and visual, so no test logic changes are expected. A test that needs rewriting is a
signal something moved that shouldn't have.

Human checks, on a phone:

1. `/timer`, `/flexible`, `/dashboard` all still load directly by URL.
2. Pill toggles between all three; the frame does not flash or reload.
3. **Start a timer, toggle to Dashboard and back — the countdown kept running.** The
   single most important check, same as last time.
4. All three Focus screens are dark, including Dashboard.
5. Dashboard heatmap shows five distinguishable levels against plum; empty days read as
   empty. Bars, axis labels and tooltip are all readable.
6. Bottom bar has three slots; the Focus slot is lit on all three Focus routes and dark
   on the hub and Life pages.
7. The drawer's Home entry returns to the hub from every route, and the header looks
   exactly as it did before this change on all eleven routes.
8. Drawer still opens from top-left and still closes five ways.
9. `/calendar` and `/timetable` render as shells with visible "Sample" chips.
10. Above 768px the bottom bar is absent and everything is reachable via the drawer.

## 11. Risks

**The dashboard ramp is the likely failure point.** It is the one thing here that
builds, lints and tests clean while still being wrong to a human eye — exactly the
class of defect that got through six reviews on the previous branch (white-on-white
login, a 3px "shape cue", a heatmap that couldn't show gradation). §7's acceptance
criteria exist to make it checkable rather than a matter of taste.

**The Focus slot's active state is easy to get subtly wrong.** `isActiveHref` handles
one href; the Focus slot needs three. A naive `isActiveHref(pathname, '/timer')` leaves
the slot unlit on `/flexible` and `/dashboard`, which builds and lints clean.

**Branch state.** `feat/life-hub-macaron` is unmerged and its verification checklist is
complete but its merge decision is outstanding. This work stacks on that branch, so
both land together.

## 12. Housekeeping

An uncommitted two-line change sits in the working tree: `ThemeModal.tsx:46` widens the
theme button's right offset from `3.75rem` to `4.5rem` so it stops touching the settings
button. It predates this session and is unrelated to this design, which no longer
touches the header at all.

It is a real improvement and should be committed on its own rather than swept into a
navigation commit. Not part of this work.
