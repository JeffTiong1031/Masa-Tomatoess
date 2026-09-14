# Notes files and folders — design

**Date:** 2026-09-15
**Status:** Awaiting review
**Setup required:** [2026-09-15-notes-files-setup.sql](2026-09-15-notes-files-setup.sql)
**Builds on:** [2026-09-09-notes-design.md](2026-09-09-notes-design.md),
[2026-09-10-notes-checklist-design.md](2026-09-10-notes-checklist-design.md)
**Mockup:** [2026-09-15-notes-files.html](../mockups/2026-09-15-notes-files.html)

## 1. What it is

Notes gets a home. Today the pad has a row of tabs and that is the whole
filing system: every tab is a note, every note is a tab, and there is nowhere
to put them. Now there is a page at **/notes** called **My files** with your
folders down the left and your notes as small cards on the right. You name a
folder, you give it a colour, and you drop notes into it.

Tapping a note opens it in the same floating pad you already have. The pad
gains two buttons, **open a file** and **save**, and Ctrl+S.

The other half of this is the difference between a scribble and a file. A note
you start inside the pad is a scribble: it stays on that device and it is not
in your files. When you try to close it, the app asks whether to save it. A
note you saved is a file: it lives in a folder, it syncs, and deleting it asks
first and sends it to a bin.

Jeff sees only Jeff's folders. Rachel sees only Rachel's.

## 2. Decisions

**Notes becomes a real place.** The old design said Notes must never be a
destination, because leaving the timer to reach a notepad was the thing it was
avoiding. That reasoning still holds for *writing* — which is why the pad stays
a floating overlay above every page. It does not hold for *filing*. Choosing a
folder is a deliberate errand and deserves a page with room. So the menu row
**Notes** stops opening the pad and starts navigating to `/notes`; the pad opens
by tapping a note, by the **N** key, or by the reopen button on the files page.

**The pad's tabs become "what is open", not "everything you own".** Right now
the tab strip lists every note that exists, which is fine at four notes and
unusable at forty. After this change the tabs are the notes you opened, the
same way tabs work in a browser. Your notes of today all become files sitting
outside any folder, and all of them start out open, so nothing looks lost the
first time you load the new version.

**A scribble stays on the device that made it.** An unsaved note is not pushed
to the cloud. It survives a refresh and a closed pad, but your phone will not
show a scribble you started on the computer. Pushing them would mean an
"Untitled" appearing on the other device that you never chose to keep, and a
delete on one device silently eating typing on the other.

**× closes, Delete deletes.** The × on a tab puts the note away and leaves the
file alone — on a scribble it asks first, because closing one really would lose
it. Deleting is the separate thing you already have: turn on **Select**, tick
what you mean, press Delete. That keeps the dangerous button away from the one
you press forty times a day.

**Saved files write themselves, like now.** There is no new way to lose work on
a file. A short pause after typing still writes it. Ctrl+S is there because
your hands already do it: on a file it writes at once and flashes *Saved*, and
on a scribble it opens the save box.

**Nothing is deleted immediately.** Deleting a file, or a folder, moves it to a
bin at the bottom of the folder list. It clears itself after 30 days. You asked
to be asked, and a bin means the answer to "are you sure" is never permanent.

**Folders hold folders.** As deep as you like. The rail indents each level.

**One dot of colour, not a painted row.** The colour is a small dot beside the
folder name. It has to survive being seen at 10 pixels beside cream, which a
tint does not, and eight tinted rows stacked up read as a fruit salad.

**Notes gets the twelfth section colour.** `#A8B257`, a moss yellow-green. It
is not a free choice: the palette rule is 20 delta E of separation from every
other accent, and a search over every pastel found that the only gap left in
the whole macaron palette is yellow-green. Anything softer or paler collides
with Flexible's butter or Fitness's mint. This one sits 24.6 delta E from its
nearest neighbour, and cocoa text on it measures 5.70:1 against a 4.5:1 floor.

**The pad pins that colour instead of borrowing the page's.** Today the active
tab wears whatever accent the page underneath happens to have, so the pad
changes colour as you navigate. It is Notes, so it wears the Notes colour
everywhere.

**The files page is allowed to be wider than the rest of the app.** A folder
list plus a card grid does not fit the width every other section uses. Notes is
the one page that gets more room.

**Drag moves notes, not folders.** Dragging a card onto a folder row files it
there. Folders are moved with the **Inside** dropdown in their own rename box.
Dragging folders into folders needs cycle-checking and drop-into-descendant
rules to be safe, and buys little.

## 3. What you see

### The files page, /notes

A left rail and a card grid.

**Left rail — folders.** Each row: an arrow if it has folders inside, a colour
dot, the name, and how many notes are directly in it. Tapping a row opens it;
tapping the arrow folds it. Under a divider at the bottom, two fixed rows:

- **Not in a folder** — files you never filed. This is where your notes of
  today land.
- **Bin** — what you deleted, with how long is left before it clears.

Above the rail: **New note**, **New folder**, and a **search** box.

**Right — cards.** One small card per note: the name, the first few lines (with
checklists drawn as checklists), the folder dot, and when you last touched it.
A **…** button on each card gives Rename, Move to…, and Move to bin. Dragging a
card onto a folder row in the rail files it there.

The pane head shows the folder's dot and name, the count, a **Latest / A–Z**
sort switch, and a **…** for the folder itself: Rename, Colour, New folder
inside, Move to bin.

**Sort** remembers your choice per person on that device. **Latest** is
newest-touched first.

**Search** filters by name across every folder, and each result says which
folder it is in. It does not search inside the words of a note.

**On a phone** the rail is the whole screen. Tap a folder and the cards slide in
with a back arrow. Cards go one per row.

**When something is open in the pad**, a small **Back to pad** button sits in
the page head. That is how a phone reopens the pad without a keyboard.

### Making a folder

A floating box: **Name**, **Colour**, **Inside**.

Colour is the eight ready circles your timer tags use, plus **More colours**
which opens the same colour wheel Timetable and Calendar use. **Inside** is a
dropdown of your folders, defaulting to top level.

### The pad

The title bar gains two buttons before minimise, maximise and close:

- **Open a file** — goes to `/notes` so you can pick something.
- **Save** — writes the file now, or opens the save box for a scribble.
  **Ctrl+S** does the same thing.

Tabs are what you have open. A scribble wears a small red dot. The lower
formatting row ends with a quiet line of grey text: **Saved in Recipes**, or
**Not saved yet**, so you always know which kind of note you are looking at
without pressing anything.

Opening a note that is already a tab jumps to that tab instead of adding a
second one.

With nothing open the pad shows two buttons, **Open a file** and **New note**.
The old rule that the pad re-seeds an empty note named *Note* when you close
the last tab is gone; it existed because tabs were the only filing system, and
it would now create an unwanted scribble every time you tidied up.

### The save box

**Name**, pre-filled from the first line you typed, and **Folder**, a dropdown
of your folders with **No folder** and **New folder…** at the bottom. Save, or
Cancel.

### The questions the app asks

Small floating boxes, the page dimmed behind. No more grey browser pop-ups —
`window.confirm` leaves Notes entirely.

- Closing a scribble: **Save before closing?** — Cancel / Don't save / Save.
- Deleting a file: **Move to bin?** — No / Yes, bin it.
- Deleting a folder: **Delete "Recipes" and everything in it?**, with the count
  of what goes with it — No / Yes, delete.
- Deleting several at once: one box, naming how many files and how many
  scribbles.

### The bin

Rows of what you deleted: the name, which folder it was in, and how many days
are left. **Put back** on each. Restoring something whose folder is also in the
bin brings the folder back with it; restoring a note whose folder was cleared
for good puts the note outside any folder.

## 4. Data

### New cloud table

```
note_folders
  id          uuid, primary key
  owner       'Jeff' | 'Rachel'
  parent_id   uuid, null for top level -> note_folders(id)
  name        text, non-empty after trim
  colour      text, #RRGGBB
  position    integer
  bin_group   uuid, null unless binned
  deleted_at  timestamptz, null unless binned
  created_at  timestamptz
  updated_at  timestamptz
```

### Three new columns on notes

```
notes
  + folder_id   uuid, null means "not in a folder" -> note_folders(id)
  + bin_group   uuid, null unless binned
  + deleted_at  timestamptz, null unless binned
```

`saved` is **not** a cloud column. A scribble is a row that only exists on the
device, so being in the cloud table *is* being saved. Locally, Dexie's `notes`
table gains `saved: boolean` and sync only ever pushes the saved ones.

`bin_group` is what makes restoring a folder work. Every delete — one note, or
a folder and the forty things under it — stamps the same fresh uuid on
everything it touches. Put one row back and the whole group comes back
together. Without it, restoring a folder would have to guess which notes went
down with it from timestamps.

`position` orders folders in the rail. Notes are ordered by the sort switch, so
`sort_order` on notes now only decides tab order in the pad.

### What stays on the device

Scribbles. Which tabs are open and which is in front. The sort choice. Which
folders are folded. The pad's place and size, as before.

## 5. How a change moves

Unchanged from the existing notes design: you type, a short pause writes the
row locally, the cloud gets a copy when the network is up, and later
`updated_at` wins if two devices disagree. Three additions:

1. **Scribbles are skipped on the way up.** The merge step also has to leave
   local scribbles alone, or a reconcile would treat "not in the cloud" as
   "deleted elsewhere" and wipe them.
2. **Binning is an edit, not a delete.** Setting `deleted_at` syncs like any
   other change, so the bin is the same on both devices.
3. **The 30-day sweep runs on load.** Anything binned longer than 30 days is
   really deleted, locally and in the cloud, by whichever device notices first.

Folders travel the same way and by the same rule.

## 6. What this version does not do

- Search inside the words of a note, only names
- Drag a folder into another folder
- Share a folder between Jeff and Rachel
- Scribbles appearing across devices
- Tags, stars, or a note in two folders at once
- Colour on a note; the dot always comes from its folder
- Merging two simultaneous edits of the same note

## 7. How we will know it works

- Make a folder, name it, colour it. It appears in the rail with the dot.
- Make a folder inside it. The rail indents and folds.
- **New note** on the files page opens an empty pad note.
- Start a note in the pad, press ×. It asks. **Don't save** loses it, **Save**
  opens the save box, **Cancel** leaves everything alone.
- Refresh with a scribble open. It is still there, still dotted red, still not
  in your files.
- Save a scribble into Recipes. The red dot goes, the grey line reads *Saved in
  Recipes*, and the card is on the files page.
- Type in a saved file, wait, close the pad, reopen from the files page. Words
  are there. Ctrl+S flashes *Saved*.
- Open a file that is already a tab. No second tab appears.
- Drag a card onto Uni. It moves. The card's dot changes colour.
- Select two files, Delete. One box, naming two files. They land in the bin.
- Put one back from the bin. It returns to the folder it came from.
- Bin a folder with notes in it. The box says how many go with it. Put the
  folder back and the notes come with it.
- Sort switch: Latest, then A–Z. Reload — the choice stuck.
- Search a word in a name. Results from every folder, each labelled.
- Jeff's folders never appear for Rachel, and the other way round.
- Network off: make a folder, save a note, bin a note. Network on: the other
  device agrees.
- Phone: rail, drill into a folder, back arrow, one card per row, **Back to
  pad** reopens what was open.
- Vitest is green, including the accent palette test with twelve accents.

## 8. Where it lives in the app

The pad stays mounted once above the route groups, as now. The files page is an
ordinary section page under `(life)` with its own accent.

Three existing decisions are deliberately reversed, and their tests change to
say the opposite of what they say today:

- `navLinks.test.ts` asserts Notes is not a destination. It is one now.
- `accents.test.ts` asserts eleven accents. Twelve now, with the new one held
  to the same 20 delta E and 20 degree separation as Calendar, Timetable and
  To-do, and pinned to `#A8B257` the way To-do is pinned.
- `notePad.ts` re-seeds a note when the last tab closes. It stops.

Two things settled while building, both small enough not to need asking but
worth writing down:

- The menu had a **Notes** button that raised the pad. It is gone, because the
  menu now has a **Notes** link to the files page and two entries with one word
  between them is a coin toss. The pad still comes up on **N** from anywhere,
  from a card on the files page, and from **Back to pad**.
- Jeff runs the SQL by hand, so there is a window where the code knows about
  `folder_id` and the table does not. Rather than fail, the cloud layer falls
  back to the columns that existed before folders: notes keep syncing, and
  only the folder each note is in waits for the paste.
