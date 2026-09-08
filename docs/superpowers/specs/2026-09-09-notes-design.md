# Notes — design

**Date:** 2026-09-09
**Status:** Awaiting review
**Setup required:** [2026-09-09-notes-setup.sql](2026-09-09-notes-setup.sql)

## 1. What it is

A notepad you can open from anywhere in the app. It is not a new page. Study,
To-do, Home — the pad sits on top, you write, you close it, and you are back
where you were. The words are already saved.

Jeff sees only Jeff’s notes. Rachel sees only Rachel’s.

## 2. Decisions

**Not a route.** A Notes page would make you leave the timer or the list. The
request was “from anywhere”, so the pad lives above the rest of the app, the
same way a running timer survives a page change.

**Phone: slide-up pad. Computer: floating window.** Phones have no spare space,
so the pad comes up from the bottom like Edit task. Computers get a solid
window you can drag, enlarge, and minimise. The page behind stays fully visible
— no grey veil, no see-through glass.

**No extra round button.** The green helper button already sits bottom-right.
Notes is a row in the side menu, plus a computer shortcut.

**Shortcut is N, only when you are not typing.** If the focus is in a text box
(“Add a task”, a note body, a rename field), N is just the letter N. Escape
closes the window.

**Yours only.** The signed-in name is a badge, same as To-do: whoever is in
`user_name` sees that person’s notes. Switching Jeff ↔ Rachel switches the pad.

**Plain words.** No colours, checklists, or sharing a tab. Tabs, a title, and a
body of text.

**Save as you type.** There is no Save button. A short pause after typing writes
locally, then copies to the cloud when the network is up.

**Local first.** Same idea as focus sessions: the device keeps the notes so
offline still works. The cloud is the copy that other devices catch up from.

**Later write wins.** Two of your devices editing the same tab at once do not
merge paragraphs. The newer `updated_at` replaces the older.

**Window place and size stay on that computer.** Drag and resize are remembered
in that browser only. A phone does not need them. Two computers may keep
different window places.

**Deleting the last tab makes a fresh empty one named Note.** The pad is never
tabless.

## 3. What you see

### Opening

- Side menu: a **Notes** row on every screen. It does not navigate. It opens
  the pad.
- Computer: **N** when you are not in a text box.
- Close: the ×, Escape, or (on the phone) dragging the pad down / tapping the
  dimmed top of the sheet. Closing does not need a veil on the computer — the
  window just goes away, and the page looks as it did.

### Phone

A sheet from the bottom. Tab names in a row that scrolls sideways. **+** adds a
tab. A large typing area. Keyboard has room.

### Computer

A solid white window with a top bar (drag), **–** (minimise to a small bar),
□ (enlarge), × (close), and a corner to pull for size. Tabs and **+** under
the bar. First open: middle-right, a size that still shows the page. After
that: last place and size on this computer. Minimise keeps the words saved;
tap the bar to open again.

### Inside the pad

- First visit: one tab named **Note**, empty.
- Tap a tab to switch. The last open tab is remembered per person, on that
  device.
- Tap a tab name to rename it. An empty name falls back to **Note**.
- Delete asks “are you sure”. Then that tab is gone.
- Body is plain text.

## 4. Data

One cloud table. Each row is one tab.

```
notes
  id            uuid, primary key
  owner         'Jeff' | 'Rachel'
  title         text, non-empty after trim
  body          text, may be empty
  sort_order    integer
  updated_at    timestamptz
  created_at    timestamptz
```

The device keeps the same rows locally so a closed pad and a dead network still
show yesterday’s words.

**Owner follows the signed-in name**, never a toggle. There is no “view
Rachel’s notes while signed in as Jeff”.

**Trust model is the same as To-do.** One shared password, then a name badge.
The `owner` column is not a lock against a curious partner; it is how the pad
picks which rows to show.

Window geometry (place, size, minimised) and “which tab is open” live only on
the device, not in the table.

## 5. How a change moves

1. You type. After a short pause the device writes the row.
2. If online, the same row is copied to the cloud.
3. If offline, it stays on the device and goes up later.
4. Opening the pad (or coming back online) pulls cloud rows for that owner and
   keeps the newer `updated_at` when both sides have the same id.

A failed cloud write does not wipe the device copy. No scary banner unless the
local write itself failed.

## 6. What this version does not do

- A Notes page in the menu that you navigate to
- A second floating round button
- A grey overlay behind the computer window
- Rich text, checklists, colours, images
- Shared tabs, or Jeff seeing Rachel’s notes
- Merging two simultaneous edits of the same tab
- Syncing the window’s place across devices

## 7. How we will know it works

- Open from Study, To-do, and Home: same pad, same words.
- Type, wait, close, open: words still there.
- Add, rename, delete (with the confirm). Last tab deleted → a new empty Note.
- Jeff’s notes never appear for Rachel, and the other way round.
- Computer: drag, enlarge, minimise, reopen. Page behind does not fade.
- Phone: sheet comes up; tab row still usable with the keyboard.
- Network off, type, network on: the note still matches.
- **N** does nothing while focus is in “Add a task”. Escape closes the window.
- Offline then online: device copy is not replaced by an older cloud row.

## 8. Where it lives in the app

The pad is mounted once, above the pages, next to the timer engine, so it
survives navigation. The menu row is an action, not a link, and is **not**
added to the list of destinations in `navLinks.ts`. Study’s bottom bar stays
as it is.
