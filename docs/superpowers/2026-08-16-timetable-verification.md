# Study timetable — human verification

**Date:** 2026-08-16
**Spec:** [specs/2026-08-16-study-timetable-design.md](specs/2026-08-16-study-timetable-design.md)

Vitest runs in a node environment with no DOM, so none of the below is
covered by the suite. Run these on a phone, not just a desktop browser.

## Setup

- [ ] `timetables` exists in Supabase and `select * from timetables;` succeeds
- [ ] Signed in as Jeff on one device, Rachel on another (or via localStorage)

## Pane states (D25)

- [ ] First paint shows skeleton bars, not an empty table
- [ ] A person with no row yet reads "Nothing planned yet."
- [ ] Offline reload shows "Couldn't load …" with a working Retry
- [ ] Retry after coming back online restores the rows

## Ownership (D23, D29)

- [ ] Your name is the top pane; your partner's is the bottom one
- [ ] Signing in as the other person swaps the order
- [ ] The bottom pane has no Edit button — not a greyed one
- [ ] Edit is hidden while the top pane is loading or errored

## Editing (D27, D28)

- [ ] Edit replaces the top card's body; no modal opens
- [ ] Editing an empty list seeds one blank row
- [ ] Add row appends and focuses the new time field
- [ ] Removing a row does not move the caret or scramble other rows' text
- [ ] Clear all then Cancel restores the original rows
- [ ] Clear all then Save persists an empty list across a reload

## Normalization (D20)

- [ ] A row with an activity and no time survives, showing "—" for the time
- [ ] A row with a time and no activity is dropped
- [ ] Rows keep the order they were typed, not chronological order

## Save failure (D26)

- [ ] Saving while offline shows an inline error
- [ ] The editor stays open and the typed rows are still there
- [ ] Saving again once online succeeds

## Cross-device (D18, D21)

- [ ] Rachel saves; Jeff refreshes and sees it (no live update expected)
- [ ] Neither person can reach an edit control for the other's list

## Layout

- [ ] Panes are stacked at every width, phone and desktop
- [ ] Every button and input is at least 44px tall
- [ ] Long activity text wraps instead of overflowing the card
