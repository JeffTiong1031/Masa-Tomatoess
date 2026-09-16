# Notes pad pictures — design

**Date:** 2026-09-16
**Status:** Approved
**Builds on:** [2026-09-09-notes-design.md](2026-09-09-notes-design.md),
[2026-09-10-notes-checklist-design.md](2026-09-10-notes-checklist-design.md),
[2026-09-15-notes-files-design.md](2026-09-15-notes-files-design.md)

## 1. What it is

You can put pictures in the notepad. Paste one from the clipboard, or press a
picture button and pick a file. The picture shows in the note. You can make it
bigger or smaller by dragging a corner. You can sit it in line with the words,
or float it on top of the words and drag it around.

The picture lives inside the note, with the words. When the note saves, the
picture saves. When the other computer opens that note, the picture is there.

The files page still shows words only. No picture on the card.

## 2. Decisions

**Pictures stay in the note body.** The note already syncs as one piece of
text. A picture is a new kind of line in that text, not a second box in the
cloud. If the note arrives, the picture arrives. If the note is still a
scribble on this device, the picture stays on this device too.

**Huge photos shrink a bit first.** Meals already shrinks a photo so the long
side is 800 pixels and saves it as webp. Notes uses the same shrink, then
stores that smaller picture in the note. A photo that is already smaller is
left alone.

**Default sit is in line.** A new picture gets its own row, in line with the
words. Words go above and below.

**A tap then a switch puts it on top of the words.** The switch lives on the
picture after you tap it. On top, the picture floats over the words. You drag
it with finger or mouse. Words can sit behind it. It does not push words out
of the way. Switch again and it goes back to its row. Switch to on top again
and it goes back to the last spot you dragged it to.

**Each picture remembers its own sit and size.** One note can have many
pictures. One can be in line while another is on top.

**Resize is a corner drag.** Same on phone and computer. No pinch.

**Delete is Backspace.** Tap the picture to pick it, then Backspace. Backspace
also takes it out when the caret is on that picture the way it takes out a
word. No extra bin on the picture.

**Not a picture, not inserted.** Paste of words stays paste of words. A file
that is not a picture does nothing. A broken picture shows an empty frame you
can Backspace away. The rest of the note stays.

**Cards ignore pictures.** Preview lines and the suggested title skip picture
rows and use words only.

## 3. What you see

### In the pad

The formatting row (Checklist, Bold, Underline, spacing) gains a picture
button. Pressing it opens the computer’s file picker, pictures only. The new
picture drops in at the caret, on its own row.

Paste: if the clipboard holds a picture, that picture is inserted the same
way. If it holds words, the pad keeps pasting words as it does today.

A picked picture shows a thin ring, corner handles, the in-line / on top
switch, and is the thing Backspace will remove.

In line, the picture is as wide as you last dragged it, up to the width of
the writing column. On top, it keeps that size and sits where you last
dragged it, as a share of the pad so a wider or narrower pad still finds it.

Phone sheet and computer window both get this.

### On the files page

No change to the cards besides skipping picture rows in the preview.

## 4. How it is stored

The note body is still lines joined by newlines. Today a line is words, or a
checklist mark plus words. A picture is a third kind of line: a mark, then
the sit (in line or on top), the display size, the on-top place, then the
webp bytes as text.

Old notes with no picture lines still decode as they do now. A picture line
that cannot be read becomes the empty frame, not a crash.

Undo and redo treat insert, resize, move, sit-switch, and delete as edits,
the same as typing.

## 5. What we will not do in this pass

- Show pictures on files-page cards.
- Pinch to resize.
- A bin button on the picture.
- Camera capture (the file picker and paste are the two doors).
- Storing pictures outside the note.

## 6. Tests

Pure functions, no DOM:

- Shrink uses the 800 long-side rule and leaves a smaller photo alone.
- Encode then decode keeps sit, size, place, and the picture bytes.
- An old note with no pictures still decodes.
- Preview and suggested title skip picture rows.
- Backspace on a picked picture removes that row.
- A non-picture paste does not insert a picture line.
- Sit switch: in line ↔ on top, and on top restores the last place.

Then in the browser: paste a picture, pick a file, drag a corner, switch to
on top and drag, Backspace it out, reload the note, confirm the files card
still shows words only.
