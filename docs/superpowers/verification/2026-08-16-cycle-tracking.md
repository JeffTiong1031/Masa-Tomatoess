# Cycle tracking — human verification

Run through this on a phone-sized window with the dev server up.

## First run

- [ ] With `cycle_periods` empty, `/cycle` says "Tell me when your last period
      started" and shows no countdown, no ring, and no predicted days.
- [ ] The hub tile reads "Not set up yet".
- [ ] On the very first period logged and still open, the History row shows the
      dates with an empty second line. Confirm this reads as "nothing to say yet"
      rather than as a broken row.

## Logging

- [ ] "I got my period" opens a sheet with today's date already filled.
- [ ] Yesterday and 2 days ago set the field correctly.
- [ ] A future date is refused with "That day has not happened yet."
- [ ] After saving, the button reads "My period stopped".
- [ ] Saving a stop date turns the button back to "I got my period".
- [ ] Logging the same start date twice is refused.
- [ ] Log two separate periods. Open the OLDER one from History, clear its last
      day, and save. It must be refused with "Only your most recent period can be
      marked as still going."
- [ ] Open the NEWEST period from History, clear its last day, and save. This must
      be allowed — it is how she corrects marking a period finished too early.

## Prediction

- [ ] With one period logged, the ring says it is using a 28-day guess.
- [ ] With two logged 29 days apart, the ring says Day N of 29.
- [ ] Editing a start date in History immediately changes the ring, the month,
      and the hub tile.
- [ ] Deleting the only period returns the page to the empty state.

## Late

- [ ] Set a start date more than one cycle ago; the ring reads "N days late",
      never a negative number.
- [ ] Log a period covering today while late; the ring switches to "Day N of
      your period".

## The two views

- [ ] The toggle switches between Now and Month.
- [ ] The chosen view survives a page reload.
- [ ] In Month, days of the same phase join into one stripe with rounded ends
      only at the ends of the run.
- [ ] Recorded period days are solid; predicted ones are dashed.
- [ ] Today is a dark filled circle and its number is readable.
- [ ] Paging back before the first logged period shows an uncoloured month.
- [ ] Every day number is readable on its fill, including out-of-month days.
- [ ] While a period is open and unfinished, the days after today must be dashed,
      not solid — they are the app's guess that it continues, not something she
      recorded.
- [ ] Let an open period run past its usual length (log a start six or more days
      ago and do not close it). Every one of those days must still be pink in the
      month view, never mint or gold.

## Symptoms

- [ ] Tapping a chip fills it and it stays filled after a reload.
- [ ] In Month, tapping a day changes which date the chips apply to.
- [ ] A day with symptoms shows a small dot in the month grid.
- [ ] In Month, tap a day, then switch back to Now. The chips card must be headed
      with today's date, and tapping a chip must fill it immediately — if the chip
      looks inert, it is writing to the wrong day.

## Offline

- [ ] Turn off the network and press Save: the sheet stays open with the typed
      date still in it and shows an error.
- [ ] Turn the network back on and press Save again: it succeeds.

## Everything else

- [ ] The estimate/not-medical-advice line is visible at the bottom.
- [ ] No console errors on load, on save, or when paging months.
- [ ] Every button is at least 44px tall.
