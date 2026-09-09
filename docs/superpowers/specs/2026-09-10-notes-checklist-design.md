# Notes checklist — design

**Date:** 2026-09-10
**Status:** Approved
**Depends on:** [2026-09-09-notes-design.md](2026-09-09-notes-design.md)

No database change. No migration. Same save path as today.

## 1. What it is

Checklist lines inside a note, in the same spirit as Google Docs. Everything
else in the note stays ordinary words. This is not the To-do list, and it is
not a full formatted editor.

You turn a paragraph into an item, tick it, nest it, and turn it back. Reload
puts every tick and every indent back.

## 2. Decisions

**Checklists only.** No bullets, numbers, bold, colours, or images in this
version. The strip is built for one extra kind of line.

**A small editor we own, not the current typing box.** The current box cannot
tick without moving the cursor, indent a family, or undo a tick as one step. No
new library.

**Same lump of words.** Ticks and indent are hidden marks inside the existing
`body`. Old notes with no marks open exactly as they do now. No new cloud
column.

**Private marks.** The editor writes a mark that ordinary typing cannot
produce. A note that already says “buy milk [x]” does not become a checklist
by accident.

**Marks never show as codes.** On screen you see squares, ticks, and words. If
a line’s marks are broken or unrecognised, that line opens as ordinary words.
The words stay. Nothing raw is shown.

**Copy-out is readable.** Other apps get `[x] ` or `[ ] ` at the start of each
line, plus two spaces of indent per nest level. That visible prefix is *not*
our private mark. Paste-in does not turn `[x] ` into a square.

**Both devices should be on this version** before you rely on ticks. An older
phone or tab still treats the note as ordinary characters and can show or tidy
the marks away if you type there.

**Shortcut is Ctrl+Shift+9** (Mac: Cmd+Shift+9). It does not clash with this
app (only **N** and Escape touch Notes) or with Chrome / Edge / Firefox
(Ctrl+9 is “last tab”; the Shift version is free). Excel uses Ctrl+Shift+9 only
inside Excel.

## 3. What you see

A thin strip sits between the tab names and the words. Same strip on phone and
computer. The floating window, the phone sheet, tabs, rename, and delete stay
as they are.

**Always on the strip:** one checklist button. It does not move. Space for In
and Out is always reserved, so the strip never changes height. In and Out are
invisible except while the cursor is on a checklist line.

**While the cursor is on a checklist line:** In and Out appear. In is grey when
that line cannot go any deeper (one step below the line above). Out is grey
when the line is already at the left.

**If the cursor is not in the words at all** (renaming a tab, the strip, just
opened the pad): the checklist button is grey and does nothing. In and Out stay
invisible, space still reserved. The keyboard shortcut does nothing.

Each item has a square to the left, lined up with its first line. Nested items
sit further in, with their own square and their own tick. Ticking a parent does
not tick its children, or the other way round.

Ticked: grey words with a strike-through. Unticked: normal body text.

Clicking a square does not move the cursor and does not pull you out of typing.

## 4. How a note is saved

Still one lump of words. After a pause, this computer writes, then the cloud
copy follows. Later write wins. Title may be trimmed; **body is not**. This
computer’s copy, the cloud row, and the merge pass the body through unchanged.
A test must pin that nothing trims, encodes, or tidies the marks away.

Reload restores every item’s tick and nesting depth.

### Places that read a note’s words today

There is no search, preview, export, share, or word count for notes.

**On screen**

- The typing area (this becomes the editor; marks are decoded, never shown)
- Tab names and the window title use the **title**, not the body

**Save and sync (keep the marks, never display them)**

- This computer’s copy
- The cloud copy
- The “newer copy wins” merge

Calendar event notes, meal write-ups, and the helper chatbot are different
features. They do not read the notepad.

If search or a preview is added later, it must use the clean words only.

### Broken marks

Unrecognised or half-written marks on a line → ordinary paragraph. Words are
kept. Raw marks are not shown.

### Older app version

An older phone or tab does not know about checklists.

- Open, look, close, without typing: marks stay. Sync copies the lump as-is.
- Type and save: whatever is in that box is kept. Leaving the hidden bits
  alone keeps ticks. Deleting or “tidying” them wipes or breaks the list. The
  newer time then wins, so that save can overwrite a good copy on the other
  device.
- They may **see** the marks as odd characters. We cannot stop that on an old
  version.

## 5. Keyboard and the checklist button

The button and **Ctrl+Shift+9** / **Cmd+Shift+9** do the same thing, and only
while the cursor is in the words.

- Ordinary paragraph(s): each selected paragraph becomes an unchecked item.
- Checklist item(s): they become ordinary paragraphs. Tick and indent are
  dropped; the words stay. If that line had sub-items, those sub-items shift
  out one step so none is left dangling.
- Mixed selection (some items, some paragraphs): each paragraph becomes an
  item; items in that selection stay items. Press again to turn the whole
  selection into paragraphs.

**Enter** on an item

- At the end: new unchecked item below, same indent. A new item is never born
  ticked.
- In the middle: the line splits. The first part keeps its tick; the rest
  becomes a new unchecked item below.
- On an empty nested item: that line moves out one step (same as Out), and
  takes its family with it.
- On an empty top-level item: it becomes an ordinary paragraph and you leave
  the list. Sub-items shift out one step.

**Backspace** at the very start of a line

- Nested item: Out one step (family comes along). It does **not** become a
  paragraph.
- Top-level item: becomes an ordinary paragraph. Words stay. Sub-items shift
  out one step.

**Tab** / **Shift+Tab**, and In / Out, move the whole family. Sub-items keep
their depth relative to the line you moved. A line cannot sit more than one
step deeper than the line above it. Phone has no Tab key; In and Out are how a
phone nests.

If several items are selected, each selected item moves with its own family.
An item that cannot move stays put; ones that can still move. The one-step
rule is checked per item against the line above it after each move.

## 6. Copy, paste, and undo

**Inside this note** (copy and paste without leaving the pad)

Ticks, nesting, and family shape are kept. A parent copied with its sub-items
pastes as that same family. Ordinary words copied with them stay ordinary
words. You do not see `[x]` appear as characters inside the pad.

**Out of the app** (WhatsApp, Mail, another site)

Each line starts with `[x] ` if ticked, `[ ] ` if not. Nesting is two spaces
per level. No private marks, no squares. Nested items are still their own
lines.

**In from another app**

Private marks are stripped before the text lands. Visible `[x] ` / `[ ] ` from
another app (or from our own copy-out) stay as ordinary characters. A paste
never creates checklist items by itself. Use the button or shortcut if you
want a list.

Paste into an existing item (including the middle of the line): the words join
**that** line. It stays one item, same tick, same indent. Several lines in the
paste still join this item; they do not become new paragraphs or new items.

**Undo** — each of these is one step: tick / untick, In (whole family), Out
(whole family), turn lines into items, turn items into paragraphs. Typing
letters undoes as typing usually does. Redo matches undo.

## 7. What this version does not do

- Bullets, numbers, bold, colours, images
- A Notes page, search, preview, export, or share
- Tying checklist items to the To-do list
- Changing the notes table, running a migration, or a new save path
- Protecting ticks on a device that has not updated yet

## 8. How we will know it works

Walk these on **computer and phone** unless a line says otherwise.

### Everyday

- Old notes open as they do now.
- A broken mark shows as plain words, never as codes, and the words are still
  there.
- Button and shortcut turn paragraphs into items and back. Several paragraphs
  become several items.
- Squares sit on the first line. Clicking one ticks without moving the cursor.
  Grey + strike when ticked. Parent and child ticks are independent.
- Reload keeps every tick and indent. The cloud round trip does not strip
  marks.
- Copy out shows `[x]` / `[ ]` and two-space indent. Paste from outside into
  an item stays on that item. Undo of tick, In, Out, and convert is one step
  each.
- Phone strip: In/Out only appear on a checklist line, space always reserved,
  In/Out grey when they cannot move. Checklist button does not slide.
- Cursor not in the words: checklist button grey, In/Out invisible.

### Mixed note

Ordinary paragraphs above a checklist, a checklist in the middle, ordinary
paragraphs below. Add an item in the middle of the list. Remove an item in the
middle (convert it back to a paragraph, or Backspace at the start of a
top-level item). The paragraphs above and below stay paragraphs. The remaining
items stay items. Nothing steals a neighbour’s line type.

### Typing cases that are easy to get wrong

Walk every line on both devices.

**Enter mid-line**

- Cursor in the middle of an unticked item: splits. First part stays unticked.
  Rest is a new unticked item below.
- Cursor in the middle of a ticked item: first part stays ticked. Rest is a
  new unticked item below.
- Cursor in the middle of a nested item: split stays at that indent.
- Cursor in the middle of a wrapped (long) line: square still lines up with
  the first line; split is at the cursor, not at the wrap.

**Multi-item selections**

- Select several ordinary paragraphs, convert: each becomes an item.
- Select several items, convert: each becomes a paragraph. Sub-items of a
  converted line shift out one step.
- Select a mix of paragraphs and items, convert once, then convert again.
- Select several items and press In / Out (computer: also Tab / Shift+Tab):
  the pad must not scramble ticks or drop words.
- Select across a paragraph and an item together, then type a letter: the
  selection is replaced in a way that still leaves each remaining line its own
  type, not a smashed hybrid.

**Phone keyboard**

- Open the pad, put the cursor in an item, type, Enter for a new item. The
  keyboard does not hide the line you are typing.
- In and Out still work with the keyboard up. Tapping a square ticks and
  leaves you in the words — the keyboard does not dismiss.
- Rename a tab, then return to the words: strip goes from “all grey” back to
  usable.
- New item is never born ticked.

**IME input** (computer and phone)

- Compose in another alphabet (for example Pinyin → Chinese) inside an item.
  While composing, tick / convert / Enter / Backspace / In / Out must not
  interrupt or commit the composition early.
- Finish composing: the characters land in that item. Tick still works.
  Undo of those characters still works.
- Compose at the start of an item, then Backspace after committing: nested vs
  top-level rules still hold.

## 9. Where it lives in the app

The pad is still the same overlay. The typing area inside it is replaced. The
checklist *rules* (Enter, Backspace, indent limit, encode / decode, copy-out
shape, strip on paste-in) live as plain functions so tests can pin them. The
feel of typing is walked in the real pad, as above.

The notes table and the save/merge path are not redesigned. They keep taking
one string and giving it back.
