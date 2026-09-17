# Notes pad links — design

**Date:** 2026-09-17
**Status:** Approved
**Builds on:** [2026-09-09-notes-design.md](2026-09-09-notes-design.md),
[2026-09-10-notes-checklist-design.md](2026-09-10-notes-checklist-design.md),
[2026-09-15-notes-files-design.md](2026-09-15-notes-files-design.md),
[2026-09-16-notes-pad-pictures-design.md](2026-09-16-notes-pad-pictures-design.md)

## 1. What it is

You can turn a web address in the notepad into a link. Type it or paste it,
then press Space or Enter. The address becomes a link. Space keeps you on
that line, so you can write words before and after it. Enter on a line that
is only the address also starts a new empty line under it.

Press the link and a small card pops up, showing where that address goes. Press
the card and the site opens in a new browser tab. The notepad stays put. Tap
anywhere else and the card closes.

The files page still shows ordinary words, including that address. No pop-up
there.

## 2. Decisions

**Space or Enter makes the link.** Paste leaves the address as ordinary
words. Space stamps it and leaves you on that line. Enter on a line that is
only the address stamps it and starts a new empty line. An old note stays
plain until you press Space or Enter on that line.

**The address is the link, not the whole line.** Words before or after it
stay ordinary. `see https://… ltr` keeps the address as a link. Spaces at
the ends of the line do not count as extra words.

**Only http:// and https://.** A `javascript:` address, a file path, or
`www.example.com` with no scheme is never a link.

**The address stays the words you typed.** Space or Enter quietly marks that
address as a link, the same idea as bold: the letters are still there. The
card is a pop-up. It is not saved in the note.

**Computer: cream card. Phone: small peek.** Same facts, different size.

- Computer: cream panel, mint icon chip, cocoa words. Site icon, name, site,
  and the short page text.
- Phone: a small pill. Site icon, name, and site. No bio.

There is no “replace URL with its title” bar.

**Press the card to open the site.** The blue address only shows the card. It
does not open the site. Tap anywhere that is not the card (including the
address, or outside the pad) and the card closes.

**Try the real page.** When the card opens, the app asks the internet for that
page’s icon, name, and short text. It sends only that address, not the rest of
the note. While it waits, the card is built from the address (site and path).
When the real page arrives, the card fills in. A later press can reuse what we
already learned. If the page will not talk to us, or there is no internet, the
card stays on the address version. You can still press the card to open the
site.

**Edit like ordinary words.** Add words before or after the address and it
stays a link. Change the address itself and the next press looks up the new
page. Backspace deletes letters as usual. Empty the line and the link is
gone. No unlink button.

**Tick-list lines follow the same rule.** Space stamps the address on the
item. If the words on an item are only that address, Enter also adds an
empty item under it. Pictures are unchanged.

**Cards on the files page stay words.** The address can appear in the preview
because it is still text. The pop-up card does not.

## 3. What you see

### In the pad

A linked address looks like a web address: underlined, using the pad’s cocoa
words and a mint underline, not a loud internet blue. Words on the same line
stay plain.

Press the address: the pop-up sits just under that line, on a computer and
as the small peek on a phone — including when the notepad fills the
website. One card at a time. Opening another link replaces the one that
was up.

The formatting row does not gain a link button. Space after an address, or
Enter on a URL-only line, is the door.

Phone sheet and computer window both get this.

### On the files page

No change besides the address remaining in the word preview.

## 4. How it is stored

The note body is still lines joined by newlines. A link is a mark on the
letters of a word line or a tick-list line, stored with the other style runs
(bold, underline). It is not a new kind of line, and not a picture.

Old notes with no link marks still decode as they do now. A mark that cannot
be read is ignored; the letters stay.

Undo and redo treat “became a link” and “stopped being a link” as edits, the
same as typing.

The pop-up’s page name and icon are remembered on this device so a second
press is faster. They are not part of the note that syncs. The other phone
looks the page up itself.

## 5. What we will not do in this pass

- Replace the address with the page title.
- Stick the card in the note under the URL.
- A link button on the formatting row.
- Auto-link a URL in the middle of a sentence.
- Auto-link `www.` with no `http://` or `https://`.
- Open the site by pressing the address.
- Show the pop-up on files-page cards.

## 6. Tests

Pure functions, no DOM:

- A line that is only `https://…` or `http://…` (ends may have spaces) is a
  URL line. Extra words is not. `javascript:` is not. `www.example.com` with
  no scheme is not.
- Enter on a URL line marks it as a link and starts a new empty line. Enter on
  a mixed line does not mark a link.
- Encode then decode keeps the link mark with the letters.
- An old note with no link marks still decodes.
- Adding extra words on a linked line drops the mark. Changing only the
  address keeps the mark if it is still a URL line.
- Address-only card copy is built from the host and path. Preview fill uses
  icon, name, site, and short text when present.

Then in the browser: paste a GitHub address, Enter, see the new line, press
the address, see cream card on a computer and small peek on a phone, tap away
to close, press the card to open a new tab, add a word and confirm it is no
longer a link.
