# Study calendar — human verification

Run through this on a phone, signed in as Jeff, with the Supabase tables created.

## Adding

- [ ] "Add event" opens the pop-up with today's date already filled in.
- [ ] Saving without a name shows "Give the event a name" under the name box, and does not close.
- [ ] An event saved with 10:00–11:00 shows in the day panel with both times.
- [ ] Flicking "all day" hides the time boxes and shows "last day".
- [ ] An end time before its start is refused with the message beside the end box.
- [ ] An end date before its start date is refused.
- [ ] Open an existing all-day event, untick "all day", type no time, and save. It
      stays all-day. (Known behaviour: the event's shape follows the times you
      type, not the switch.)

## Reading

- [ ] A day with nothing on says "Nothing on" rather than showing empty hours.
- [ ] A day with one event at 10:00 shows roughly three hours of timeline, not 24.
- [ ] An all-day event spanning three days shows on all three.
- [ ] Week: tapping a date bubble changes the panel below.
- [ ] Month: tapping a day changes the panel below; days outside the month are dimmed.
- [ ] Year: tapping a busy square lands on that day in Week view.
- [ ] Today is marked in both the rail and the month grid.
- [ ] In a week that straddles two months, tap a date belonging to the later
      month, then switch to Month view. Check which month it shows. (Known gap:
      it may stay on the earlier month.)
- [ ] On the Year view, try reaching a day square using only the keyboard.
      (Known gap: the squares respond to taps but are not keyboard-reachable;
      Week and Month both offer the same navigation with real buttons.)

## Two people

- [ ] The person filter opens on Jeff.
- [ ] Rachel's events show outlined rather than filled.
- [ ] Tapping one of Rachel's events opens it with no Save button and a line saying so.
- [ ] Switching to Rachel then Both changes what is shown, and the dots change with it.
- [ ] Sign in as Rachel and open one of Jeff's events. The read-only notice must
      name Jeff, not Rachel.

## Categories

- [ ] Adding a category with an existing name (in any casing) is refused.
- [ ] A tagged event shows a dot in its category's colour.
- [ ] Every swatch is distinguishable from every other at dot size, on a phone, at arm's length.
- [ ] Deleting a category names the correct number of events in the confirm.
- [ ] After deleting, those events are still there, just untagged.
- [ ] Renaming a category updates the chip, the event dots and the pop-up at once.

## Search

- [ ] Typing replaces the calendar with results.
- [ ] Searching a word that only appears in remarks finds the event.
- [ ] Past matches appear dimmed rather than missing.
- [ ] Clearing the box brings the calendar back where it was.

## Countdown

- [ ] An event ticked "count down to this" appears at /countdown.
- [ ] The day count is right, and today reads 0.
- [ ] A past ticked event does not appear.
- [ ] With nothing ticked, the page explains how to add one.
- [ ] Leave the countdown page open past midnight. The day counts will not tick
      over until you navigate away and back. (Known behaviour, matching every
      other page in the app.)

## Everything else

- [ ] No hydration warning in the console on first load.
- [ ] The page does not scroll sideways at 375px wide.
- [ ] Every button is comfortably tappable with a thumb.
- [ ] Turning the network off and saving shows an error and keeps what was typed.
