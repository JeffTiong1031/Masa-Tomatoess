# Notes checklist human verification walk

Date: 2026-09-10
Spec: `docs/superpowers/specs/2026-09-10-notes-checklist-design.md` §8
Walked in the running pad at desktop and 390×844 (phone-width sheet). Not a screenshot-only run: clicks, Enter, Tab, ticks, copy/paste, and undo were exercised.

`Not run` is not a pass.

## Everyday

| Check | Computer Pass/Fail | Phone-width Pass/Fail | Notes |
|---|---|---|---|
| Old notes open as they do now. | Pass | Pass | Empty and plain-paragraph notes opened as words, no squares. |
| A broken mark shows as plain words, never as codes, and the words are still there. | Pass | Pass | Seeded `\u001Enope keep these words`. Screen showed `nope keep these words` as a paragraph; no checkbox; no private codes. |
| Button and shortcut turn paragraphs into items and back. Several paragraphs become several items. | Pass | Pass | Button, Ctrl+Shift+9, and Ctrl+A (or Shift+Arrow) convert several lines at once. |
| Squares sit on the first line. Clicking one ticks without moving the cursor. Grey + strike when ticked. Parent and child ticks are independent. | Pass | Pass | Square top matches first line. Tick left caret in the words. Ticked text is muted + strike. Parent tick did not change the child. |
| Reload keeps every tick and indent. The cloud round trip does not strip marks. | Pass / Not run | Pass / Not run | Reload kept ticks and indent on Walk. Cloud **Not run**: `placeholder.supabase.co` does not resolve (`ERR_NAME_NOT_RESOLVED`). |
| Copy out shows `[x]` / `[ ]` and two-space indent. Paste from outside into an item stays on that item. Undo of tick, In, Out, and convert is one step each. | Pass | Pass | Nested ticked copy was `  [x] Eggs`. External `alpha\\nbeta` stayed on that item as one line. Undo restored tick / In / Out / convert / paste in one step each. |
| Phone strip: In/Out only appear on a checklist line, space always reserved, In/Out grey when they cannot move. Checklist button does not slide. | Pass | Pass | Checklist X stayed 20.67px hidden vs visible. In/Out stay in layout (`visibility: hidden`) and disable (grey) at the top level. |
| Cursor not in the words: checklist button grey, In/Out invisible. | Pass | Pass | Checklist disabled; In/Out `aria-hidden` and not visible. |

## Mixed note

| Check | Computer Pass/Fail | Phone-width Pass/Fail | Notes |
|---|---|---|---|
| Ordinary paragraphs above a checklist, a checklist in the middle, ordinary paragraphs below. Add an item in the middle of the list. Remove an item in the middle (convert it back to a paragraph, or Backspace at the start of a top-level item). The paragraphs above and below stay paragraphs. The remaining items stay items. Nothing steals a neighbour's line type. | Pass | Pass | Above/Below stayed paragraphs. Adding Mid kept Child as an item. Convert or Backspace on Mid turned only Mid into a paragraph. |

## Typing cases that are easy to get wrong

### Enter mid-line

| Check | Computer Pass/Fail | Phone-width Pass/Fail | Notes |
|---|---|---|---|
| Cursor in the middle of an unticked item: splits. First part stays unticked. Rest is a new unticked item below. | Pass | Pass | `Buy` / ` milk`, both unticked items. |
| Cursor in the middle of a ticked item: first part stays ticked. Rest is a new unticked item below. | Pass | Pass | Computer: `Eg` ticked, `gs` new unticked. Phone-width re-walk while still ticked: `He` stayed ticked, `llo` new unticked. |
| Cursor in the middle of a nested item: split stays at that indent. | Pass | Pass | Both halves stayed at 24px. |
| Cursor in the middle of a wrapped (long) line: square still lines up with the first line; split is at the cursor, not at the wrap. | Pass | Pass | Square height 44px, text taller; tops aligned. Caret at offset 10 split after `WrapTarget`, not at the wrap. |

### Multi-item selections

| Check | Computer Pass/Fail | Phone-width Pass/Fail | Notes |
|---|---|---|---|
| Select several ordinary paragraphs, convert: each becomes an item. | Pass | Pass | Ctrl+A then Checklist turned Alpha/Bravo/Charlie into three items. |
| Select several items, convert: each becomes a paragraph. Sub-items of a converted line shift out one step. | Pass | Pass | Ctrl+A convert back turned those items into paragraphs. Parent+child range: both became paragraphs. |
| Select a mix of paragraphs and items, convert once, then convert again. | Pass | Pass | Para+Item → both items, then both paragraphs. |
| Select several items and press In / Out (computer: also Tab / Shift+Tab): the pad must not scramble ticks or drop words. | Pass | Pass | One+Two under Head: Tab and Indent nested both to 24px; Shift+Tab and Outdent restored. Words stayed. |
| Select across a paragraph and an item together, then type a letter: the selection is replaced in a way that still leaves each remaining line its own type, not a smashed hybrid. | Pass | Pass | `Ab` paragraph + `Cd` item, range from after A through C, type `x` → `Ax` paragraph and `d` item. Drag across lines no longer empties or joins words. |

### Phone keyboard

| Check | Computer Pass/Fail | Phone-width Pass/Fail | Notes |
|---|---|---|---|
| Open the pad, put the cursor in an item, type, Enter for a new item. The keyboard does not hide the line you are typing. | Not run | Not run | No real phone keyboard. Desktop/phone-width Enter still made a new item. |
| In and Out still work with the keyboard up. Tapping a square ticks and leaves you in the words — the keyboard does not dismiss. | Not run | Not run | No real phone keyboard. At phone-width, In/Out clicks and tick-without-moving-caret still worked with the desktop keyboard. |
| Rename a tab, then return to the words: strip goes from “all grey” back to usable. | Pass | Pass | During rename: checklist grey, In/Out hidden. After clicking the words: usable again. |
| New item is never born ticked. | Pass | Pass | Enter after a ticked/nested item created an empty unticked item. |

### IME input

| Check | Computer Pass/Fail | Phone-width Pass/Fail | Notes |
|---|---|---|---|
| Compose in another alphabet (for example Pinyin → Chinese) inside an item. While composing, tick / convert / Enter / Backspace / In / Out must not interrupt or commit the composition early. | Not run | Not run | No IME available in this browser session. |
| Finish composing: the characters land in that item. Tick still works. Undo of those characters still works. | Not run | Not run | No IME available in this browser session. |
| Compose at the start of an item, then Backspace after committing: nested vs top-level rules still hold. | Not run | Not run | No IME available in this browser session. |
