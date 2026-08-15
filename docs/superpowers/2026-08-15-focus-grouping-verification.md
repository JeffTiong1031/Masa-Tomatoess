# Focus grouping — human verification checklist

Everything below needs a human with the shared password, on a real phone. No
subagent entered, guessed, or bypassed that password at any point, so none of
this was checked visually during implementation. The numbers were made provable
instead — 110 tests now assert the colour and layout facts that used to be
opinions — but a person still has to look at the screen.

**Do this first.** The `.next/` build cache was deleted during this work, so the
dev server that was running before it is stale. Kill it and start fresh:

```bash
npm run dev
```

## The two that matter most

**1. The top-right buttons are back where they belong.** Open `/timer`, then
`/flexible`. The Settings and Theme buttons must sit level with the hamburger at
the top of the screen. Before the fix they were stranded 122px down the page,
floating in the middle-right — and worse than that on an installed iPhone PWA.
This was the one genuinely broken thing this work introduced.

**2. A running timer survives the pill.** On `/timer`, start a session and note
the time. Tap **Dashboard** in the pill, wait 30 seconds, tap **Timer** again.
The countdown must be ~30 seconds further along — still ticking, not reset and
not paused-and-resumed. If this fails, something moved `TimerEngine` out of
`AppShell`, and that is the real bug.

## The rest

3. **The pill** shows on `/timer`, `/flexible` and `/dashboard` and nowhere else.
   The active segment is filled with that widget's colour — coral, yellow,
   lavender — with dark text on it.

4. **Dashboard is dark.** All three Focus screens are plum, Dashboard included.
   The heatmap should show five clearly different levels, and days with no
   activity should read as empty while still being visible as a grid. Hover a
   bar: the tooltip should look like a panel with a real edge, not floating text.

5. **Bottom bar has three slots** below 768px — Focus, Calendar, Timetable. The
   Focus slot must be lit on all three Focus routes, and dark on the hub and Life
   pages. Above 768px there is no bottom bar at all.

6. **The drawer's Focus entry** is highlighted on `/flexible` and `/dashboard`,
   not just `/timer`. On a desktop window this is the only active indicator there
   is, so it matters more there than on the phone.

7. **The header is otherwise untouched** on all eleven routes. Hamburger
   top-left, Settings and Theme top-right. No Home button was added — the
   drawer's existing Home entry does that job.

8. **`/calendar` and `/timetable`** render with a visible `Sample` chip on every
   block of made-up data. Nothing on those pages should look like real saved
   information.

## Two things to judge by eye

**The two new accent colours.** Calendar and Timetable needed their own colours,
and the first pair I picked were too close to Countdown and Dashboard to tell
apart at icon size. The replacements are measurably distinct, but one of them
sits slightly outside the existing family:

| accent | hex | lightness | saturation |
|---|---|---|---|
| existing eight | — | 71.8 – 84.2 | 19.0 – 39.8 |
| **calendar** | `#FFB5F4` | 82.3 | **41.9** ← palette's highest |
| **timetable** | `#72E2FF` | 84.6 | 33.9 |

Both are within the lightness band. Timetable is fully inside the family.
Calendar is the most saturated chip you now have, about 5% past the previous
ceiling. Look at the hub grid and the drawer and say whether it still reads
"macaron" to you — it is a one-line change in `globals.css` if not.

**`/timer` on a small phone.** On a 375×667 screen (iPhone SE or 8), the
Reset / Start / Skip row still needs about a 92px scroll to reach. This work
made that *better*, not worse — it was ~152px before the fix, and the row
already sat 7px below the fold before any of this existed. Meeting the "no
scroll at all" bar needs the timer dial itself to shrink on short screens, which
is a visible design change to your main screen and so your call, not mine.

## Not part of this work, but you should know

**The shared password does not actually protect the app.**
[Gatekeeper.tsx:71](../../src/components/Gatekeeper.tsx#L71) renders everything
as soon as `localStorage.user_name` is set, and the password result lives only
in React state that is never persisted. Anyone who opens devtools on your Vercel
URL and sets that one key is straight in, no password needed. The page bundle is
served before any check runs, so this is not fixable by moving the check around
in the client.

Nothing was leaked finding this out, and your Supabase service-role key was
never read. But the protection you think you have around the period-cycle and
finance pages is not there. Worth its own piece of work.
