# Notes Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Docs–style checklists to the existing Notes pad, with ticks and indent saved in the same `body` string.

**Architecture:** All checklist rules are pure functions in `src/lib/` so Vitest can pin them (no DOM). The pad still saves one string; the editor encodes and decodes at the edge. No new library, no schema change, no change to Dexie or Supabase write paths. The typing box is replaced by a small editor we own.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript strict, Tailwind v4, Zustand persist, Dexie, Supabase, Vitest, lucide-react. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-09-10-notes-checklist-design.md](../specs/2026-09-10-notes-checklist-design.md)

## Global Constraints

- **Never hardcode a colour.** Components reference `--mt-*` semantic tokens only. Raw `--mac-*` hues stay inside `globals.css`. Notes does **not** add an accent.
- **Do not write comments.** Names and structure carry the meaning.
- **No defensive programming.** No guards for states the types exclude.
- **No `instanceof`, no `typeof` branching** to discriminate shapes. `Block` is a discriminated union; switch on `kind`.
- **Handle exceptions only where there is something to do about them.** Pure functions in `noteDoc.ts` / `noteCopy.ts` / `noteEdit.ts` / `noteHistory.ts` do not catch.
- Server Components by default; `'use client'` only on the leaf that needs it.
- Touch targets at least 44px (`min-h-11 min-w-11`).
- **Commits are Jeff's alone.** Never add a `Co-Authored-By` trailer or any generated-with attribution.
- Next.js 16 differs from training data. Read `node_modules/next/dist/docs/` before writing App Router code. This feature adds **no new route**.
- **Do not** add a library (no TipTap, ProseMirror, Lexical, Slate).
- **Do not** change the notes table, Dexie schema, `noteLocal.ts` write shape, `noteRepo.ts` mapping, or `noteSync.ts` merge. Body stays a string. Task 2 only *adds tests* that the existing mapping leaves marks unchanged.
- Pause after typing before save stays `NOTE_SAVE_PAUSE_MS = 400`.
- Branch: cut `feat/notes-checklist` from current `main` before the first commit of Task 1.

## File map

| File | Responsibility |
|---|---|
| `src/lib/noteDoc.ts` | `Block`, private marks, `decodeBody` / `encodeBody` / `stripMarks` |
| `src/lib/noteDoc.test.ts` | old notes, round-trip, broken marks, `[x]` is not a mark |
| `src/lib/noteCopy.ts` | copy-out `[x]` / `[ ]` + two spaces; strip marks on paste-in; join external paste |
| `src/lib/noteCopy.test.ts` | copy-out shape, strip, join |
| `src/lib/noteEdit.ts` | caret, toggle, indent family, Enter, Backspace, insert, delete, tick |
| `src/lib/noteEdit.test.ts` | every keyboard and selection rule in the spec |
| `src/lib/noteHistory.ts` | undo / redo stack |
| `src/lib/noteHistory.test.ts` | one structural step, redo |
| `src/lib/noteShortcut.ts` | contenteditable counts as typing; checklist hotkey |
| `src/lib/note.ts` | unchanged mapping; extra test that body with marks round-trips |
| `src/lib/noteMerge.test.ts` | extra test that merge does not tidy marks |
| `src/components/notes/NotesStrip.tsx` | checklist + reserved In/Out |
| `src/components/notes/NotesEditor.tsx` | the typing surface |
| `src/components/notes/NotesPad.tsx` | strip + editor in place of the textarea |
| `docs/superpowers/verification/2026-09-10-notes-checklist.md` | human walk from spec §8 |

Encode format (lock this; do not invent another):

- Item line: `'\u001E' + ('1' | '0') + '/' + indent + '\u001F' + text`
- Paragraph line: the words only (marks stripped)
- Body: lines joined with `'\n'`
- `'\u001E'` and `'\u001F'` are the only private marks. Ordinary typing cannot produce them.
- Copy-out `[x] ` / `[ ] ` is **not** this format and must not decode as an item.

---

### Task 1: Encode and decode

**Files:**
- Create: `src/lib/noteDoc.ts`
- Create: `src/lib/noteDoc.test.ts`
- Modify: `docs/superpowers/specs/2026-09-10-notes-checklist-design.md` (status line only: `Awaiting review` → `Approved`)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export const NOTE_MARK_START = '\u001E'`
  - `export const NOTE_MARK_SEP = '\u001F'`
  - `export type ParagraphBlock = { kind: 'paragraph'; text: string }`
  - `export type ItemBlock = { kind: 'item'; text: string; checked: boolean; indent: number }`
  - `export type Block = ParagraphBlock | ItemBlock`
  - `export function stripMarks(raw: string): string`
  - `export function decodeLine(raw: string): Block`
  - `export function encodeLine(block: Block): string`
  - `export function decodeBody(body: string): Block[]`
  - `export function encodeBody(blocks: Block[]): string`

- [ ] **Step 1: Cut the branch and mark the spec approved**

```bash
git checkout -b feat/notes-checklist
```

In the spec, change `**Status:** Awaiting review` to `**Status:** Approved`.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/noteDoc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  NOTE_MARK_START,
  NOTE_MARK_SEP,
  decodeBody,
  encodeBody,
  decodeLine,
  stripMarks,
} from './noteDoc';

describe('stripMarks', () => {
  it('removes only the private start and sep characters', () => {
    expect(stripMarks(`hi${NOTE_MARK_START}there${NOTE_MARK_SEP}`)).toBe('hithere');
  });
});

describe('decodeLine', () => {
  it('treats a plain line as a paragraph', () => {
    expect(decodeLine('buy milk [x]')).toEqual({
      kind: 'paragraph',
      text: 'buy milk [x]',
    });
  });

  it('decodes a ticked nested item', () => {
    expect(decodeLine(`${NOTE_MARK_START}1/2${NOTE_MARK_SEP}Eggs`)).toEqual({
      kind: 'item',
      text: 'Eggs',
      checked: true,
      indent: 2,
    });
  });

  it('opens a broken mark as a paragraph and keeps the words', () => {
    expect(decodeLine(`${NOTE_MARK_START}nope Eggs`)).toEqual({
      kind: 'paragraph',
      text: 'nope Eggs',
    });
  });
});

describe('decodeBody / encodeBody', () => {
  it('opens an empty note as one empty paragraph and writes back empty', () => {
    expect(decodeBody('')).toEqual([{ kind: 'paragraph', text: '' }]);
    expect(encodeBody([{ kind: 'paragraph', text: '' }])).toBe('');
  });

  it('round-trips ordinary notes unchanged', () => {
    expect(encodeBody(decodeBody('hello'))).toBe('hello');
    expect(encodeBody(decodeBody('a\nb'))).toBe('a\nb');
  });

  it('round-trips ticks and indent', () => {
    const blocks = [
      { kind: 'paragraph' as const, text: 'Above' },
      { kind: 'item' as const, text: 'Parent', checked: false, indent: 0 },
      { kind: 'item' as const, text: 'Child', checked: true, indent: 1 },
      { kind: 'paragraph' as const, text: 'Below' },
    ];
    expect(decodeBody(encodeBody(blocks))).toEqual(blocks);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteDoc.test.ts`

Expected: FAIL — module `./noteDoc` does not exist.

- [ ] **Step 4: Write the minimal implementation**

Create `src/lib/noteDoc.ts`. Switch on `block.kind`. `decodeBody('')` returns one empty paragraph. Split on `'\n'`. A line is an item only when it matches `NOTE_MARK_START + '0'|'1' + '/' + digits + NOTE_MARK_SEP + rest`. Anything else is a paragraph with `stripMarks` applied to the whole line. `encodeLine` for an item writes that exact pattern; for a paragraph writes `stripMarks(text)`. `encodeBody` of a single empty paragraph is `''`; otherwise join `encodeLine` with `'\n'`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/noteDoc.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/noteDoc.ts src/lib/noteDoc.test.ts docs/superpowers/specs/2026-09-10-notes-checklist-design.md
git commit -m "feat(notes): encode checklist ticks in the existing body string"
```

---

### Task 2: Pin that save and merge do not tidy marks

**Files:**
- Modify: `src/lib/noteRepo.test.ts` (add cases; do not change `note.ts` / `noteRepo.ts` / `noteLocal.ts` / `noteSync.ts` unless a test proves they already alter body — then STOP and ask)
- Modify: `src/lib/noteMerge.test.ts`

**Interfaces:**
- Consumes: `noteFromRow`, `rowFromNote`, `mergeNotes`
- Produces: tests only

- [ ] **Step 1: Write the failing tests**

In `src/lib/noteRepo.test.ts`, add (import `NOTE_MARK_START` and `NOTE_MARK_SEP` from `./noteDoc`):

```ts
it('passes checklist marks through cloud mapping unchanged', () => {
  const body = `Above\n${NOTE_MARK_START}1/1${NOTE_MARK_SEP}Eggs`;
  const marked = { ...note, body };
  expect(rowFromNote(marked).body).toBe(body);
  expect(noteFromRow({ ...row, body }).body).toBe(body);
});
```

In `src/lib/noteMerge.test.ts`:

```ts
it('does not tidy checklist marks when the later row wins', () => {
  const body = `${NOTE_MARK_START}0/0${NOTE_MARK_SEP}Milk`;
  const local = [note({ id: 'a', body: 'plain', updatedAt: EARLY })];
  const remote = [note({ id: 'a', body, updatedAt: LATE })];
  expect(mergeNotes(local, remote, [])[0].body).toBe(body);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteRepo.test.ts src/lib/noteMerge.test.ts`

Expected: FAIL only if the new cases are missing — then they FAIL as not found. After adding them: they should **PASS** against current mapping (body is copied as-is). That is the point: pin existing behaviour. If either **fails**, stop and ask; do not “fix” the save layer in this task.

- [ ] **Step 3: Confirm they pass without production changes**

Run: `npx vitest run src/lib/noteRepo.test.ts src/lib/noteMerge.test.ts`

Expected: PASS with no edits to `note.ts`, `noteRepo.ts`, `noteLocal.ts`, `noteSync.ts`, or `noteMerge.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/noteRepo.test.ts src/lib/noteMerge.test.ts
git commit -m "test(notes): pin that cloud mapping leaves checklist marks alone"
```

---

### Task 3: Copy-out and paste-in strings

**Files:**
- Create: `src/lib/noteCopy.ts`
- Create: `src/lib/noteCopy.test.ts`

**Interfaces:**
- Consumes: `Block`, `stripMarks` from `noteDoc.ts`
- Produces:
  - `export const NOTE_CLIPBOARD_TYPE = 'application/x-masa-note-blocks'`
  - `export function copyOut(blocks: Block[]): string`
  - `export function stripIncoming(raw: string): string`
  - `export function joinIntoLine(raw: string): string`

`copyOut`: for each block, a line. Paragraph → `text`. Item → `' '.repeat(indent * 2) + (checked ? '[x] ' : '[ ] ') + text`. Join with `'\n'`. Never emit private marks.

`stripIncoming`: `stripMarks(raw)` only. Visible `[x] ` stays.

`joinIntoLine`: `stripIncoming`, split on `/\r?\n/`, drop empty trailing piece if the string ended with a newline, join remaining pieces with a single space. Used when pasting into an item.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { NOTE_MARK_START, NOTE_MARK_SEP } from './noteDoc';
import { copyOut, stripIncoming, joinIntoLine } from './noteCopy';

describe('copyOut', () => {
  it('writes ticks and two spaces per indent', () => {
    expect(
      copyOut([
        { kind: 'item', text: 'Parent', checked: true, indent: 0 },
        { kind: 'item', text: 'Child', checked: false, indent: 1 },
        { kind: 'paragraph', text: 'After' },
      ]),
    ).toBe('[x] Parent\n  [ ] Child\nAfter');
  });
});

describe('stripIncoming', () => {
  it('strips private marks and leaves visible [x] alone', () => {
    expect(stripIncoming(`${NOTE_MARK_START}1/0${NOTE_MARK_SEP}Eggs`)).toBe('1/0Eggs');
    expect(stripIncoming('[x] Eggs')).toBe('[x] Eggs');
  });
});

describe('joinIntoLine', () => {
  it('joins several pasted lines onto one line', () => {
    expect(joinIntoLine('one\ntwo\nthree')).toBe('one two three');
  });
});
```

Note: `stripIncoming` on a full encoded line removes only `\u001E` and `\u001F`, so `${NOTE_MARK_START}1/0${NOTE_MARK_SEP}Eggs` becomes `1/0Eggs`. That is correct for “never show a raw mark”: the leftover digits are ordinary characters. Internal paste uses `decodeBody`, not `stripIncoming`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteCopy.test.ts`

Expected: FAIL — module `./noteCopy` does not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/noteCopy.ts` as specified above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/noteCopy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/noteCopy.ts src/lib/noteCopy.test.ts
git commit -m "feat(notes): copy checklists out as readable ticks and indent"
```

---

### Task 4: Toggle, tick, indent, family

**Files:**
- Create: `src/lib/noteEdit.ts`
- Create: `src/lib/noteEdit.test.ts`

**Interfaces:**
- Consumes: `Block` from `noteDoc.ts`
- Produces:
  - `export interface DocCaret { index: number; offset: number }`
  - `export interface EditResult { blocks: Block[]; caret: DocCaret }`
  - `export function familyEnd(blocks: Block[], index: number): number`
  - `export function canIndent(blocks: Block[], index: number): boolean`
  - `export function canOutdent(blocks: Block[], index: number): boolean`
  - `export function selectedRoots(blocks: Block[], from: number, to: number): number[]`
  - `export function toggleChecked(blocks: Block[], index: number): Block[]`
  - `export function toggleChecklist(blocks: Block[], from: number, to: number, caret: DocCaret): EditResult`
  - `export function indentSelection(blocks: Block[], from: number, to: number, caret: DocCaret): EditResult`
  - `export function outdentSelection(blocks: Block[], from: number, to: number, caret: DocCaret): EditResult`

Rules:

- `familyEnd`: if `blocks[index].kind !== 'item'`, return `index`. Else walk forward while the next block is an item with `indent >` this item’s indent.
- `canIndent`: item, and `indent + 1` is not deeper than one below the line above. No line above, or line above is a paragraph → max indent is 0 (cannot indent a top-level first item). Line above is an item → max is `above.indent + 1`.
- `canOutdent`: item with `indent > 0`.
- `selectedRoots`: item indices in `[from, to]` whose ancestor item is **not** also in `[from, to]`. Indent/outdent only these, each with its family, top to bottom. An item that cannot move stays put.
- `toggleChecked`: if that block is an item, flip `checked`. Do not touch children. Paragraph: return blocks unchanged.
- `toggleChecklist`: if any block in range is a paragraph, convert **only those paragraphs** to `{ kind: 'item', checked: false, indent: 0 }` (items stay). If every block in range is an item, convert each (top to bottom) to a paragraph and subtract 1 from that item’s former descendants (`indent >` converted item’s indent, consecutive items after it).
- Indent/outdent add/subtract 1 on the root and every block through `familyEnd`, when `canIndent` / `canOutdent` for that root.

Caret is returned unchanged (same index/offset) unless a later task says otherwise.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/noteEdit.test.ts` with at least:

```ts
import { describe, it, expect } from 'vitest';
import {
  familyEnd,
  canIndent,
  canOutdent,
  toggleChecked,
  toggleChecklist,
  indentSelection,
  outdentSelection,
} from './noteEdit';
import type { Block } from './noteDoc';

const caret = { index: 0, offset: 0 };

const sample: Block[] = [
  { kind: 'paragraph', text: 'Above' },
  { kind: 'item', text: 'Parent', checked: false, indent: 0 },
  { kind: 'item', text: 'Child', checked: true, indent: 1 },
  { kind: 'paragraph', text: 'Below' },
];

describe('familyEnd', () => {
  it('includes nested items and stops at a sibling-or-shallower line', () => {
    expect(familyEnd(sample, 1)).toBe(2);
    expect(familyEnd(sample, 2)).toBe(2);
    expect(familyEnd(sample, 0)).toBe(0);
  });
});

describe('canIndent / canOutdent', () => {
  it('blocks indent deeper than one below the line above', () => {
    expect(canIndent(sample, 1)).toBe(false);
    expect(canIndent(sample, 2)).toBe(false);
    expect(canOutdent(sample, 1)).toBe(false);
    expect(canOutdent(sample, 2)).toBe(true);
  });
});

describe('toggleChecked', () => {
  it('flips one item and leaves children alone', () => {
    const next = toggleChecked(sample, 1);
    expect(next[1]).toMatchObject({ kind: 'item', checked: true });
    expect(next[2]).toMatchObject({ kind: 'item', checked: true });
  });
});

describe('toggleChecklist', () => {
  it('converts every paragraph in the range to an unchecked item', () => {
    const next = toggleChecklist(sample, 0, 3, caret).blocks;
    expect(next[0]).toEqual({ kind: 'item', text: 'Above', checked: false, indent: 0 });
    expect(next[1]).toMatchObject({ kind: 'item', text: 'Parent' });
    expect(next[3]).toEqual({ kind: 'item', text: 'Below', checked: false, indent: 0 });
  });

  it('converts items back to paragraphs and shifts children out one step', () => {
    const listed: Block[] = [
      { kind: 'item', text: 'Parent', checked: true, indent: 0 },
      { kind: 'item', text: 'Child', checked: false, indent: 1 },
    ];
    const next = toggleChecklist(listed, 0, 0, caret).blocks;
    expect(next[0]).toEqual({ kind: 'paragraph', text: 'Parent' });
    expect(next[1]).toEqual({ kind: 'item', text: 'Child', checked: false, indent: 0 });
  });
});

describe('indentSelection', () => {
  it('moves the family together', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'B', checked: false, indent: 0 },
      { kind: 'item', text: 'B1', checked: true, indent: 1 },
    ];
    const next = indentSelection(nested, 1, 1, caret).blocks;
    expect(next[1]).toMatchObject({ indent: 1 });
    expect(next[2]).toMatchObject({ indent: 2, checked: true });
  });

  it('does not indent a child twice when the parent is also selected', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'A1', checked: false, indent: 1 },
    ];
    const next = indentSelection(nested, 0, 1, caret).blocks;
    expect(next[0]).toMatchObject({ indent: 1 });
    expect(next[1]).toMatchObject({ indent: 2 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteEdit.test.ts`

Expected: FAIL — module `./noteEdit` does not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/noteEdit.ts` with the functions above. Switch on `kind`. Do not mutate the input array; copy blocks you change.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/noteEdit.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/noteEdit.ts src/lib/noteEdit.test.ts
git commit -m "feat(notes): toggle and indent checklist families"
```

---

### Task 5: Enter and Backspace

**Files:**
- Modify: `src/lib/noteEdit.ts`
- Modify: `src/lib/noteEdit.test.ts`

**Interfaces:**
- Consumes: Task 4 functions, especially `outdentSelection` and `toggleChecklist`
- Produces:
  - `export function enterAt(blocks: Block[], caret: DocCaret): EditResult`
  - `export function backspaceAtStart(blocks: Block[], caret: DocCaret): EditResult | null`

`enterAt`:

- Paragraph: split text at offset into two paragraphs. Caret at start of the new one.
- Item, offset at end (`offset === text.length`): insert `{ kind: 'item', text: '', checked: false, indent: same }` **below**. Caret at start of the new item. Never pre-checked.
- Item, offset in the middle: first item keeps its text prefix and its `checked`; new item below gets the suffix, `checked: false`, same indent. Caret at start of the new item.
- Item, empty text (`text === ''`), `indent > 0`: `outdentSelection` on that index only (family comes along). Caret stays on that line.
- Item, empty text, `indent === 0`: `toggleChecklist` on that index (becomes paragraph; descendants shift out). Caret stays.

`backspaceAtStart`:

- If `offset !== 0`, return `null` (the editor deletes a character).
- Nested item (`indent > 0`): same as Out for that index (family comes along). Return that result.
- Top-level item: `toggleChecklist` on that index (paragraph + descendants shift out).
- Paragraph, `index === 0`: return unchanged blocks (do not delete the last line).
- Paragraph, `index > 0`: merge this text onto the previous block (previous keeps its `kind`); drop this block. Caret at the join point.

- [ ] **Step 1: Write the failing tests** (append to `noteEdit.test.ts`)

```ts
describe('enterAt', () => {
  it('creates an unchecked item below at the same indent', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'Hello', checked: true, indent: 1 },
    ];
    const next = enterAt(blocks, { index: 0, offset: 5 });
    expect(next.blocks[0]).toMatchObject({ text: 'Hello', checked: true });
    expect(next.blocks[1]).toEqual({
      kind: 'item',
      text: '',
      checked: false,
      indent: 1,
    });
    expect(next.caret).toEqual({ index: 1, offset: 0 });
  });

  it('splits in the middle and does not copy the tick', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'Hello', checked: true, indent: 0 },
    ];
    const next = enterAt(blocks, { index: 0, offset: 2 });
    expect(next.blocks[0]).toEqual({
      kind: 'item',
      text: 'He',
      checked: true,
      indent: 0,
    });
    expect(next.blocks[1]).toEqual({
      kind: 'item',
      text: 'llo',
      checked: false,
      indent: 0,
    });
  });

  it('outdents an empty nested item and exits an empty top-level item', () => {
    const nested: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: '', checked: false, indent: 1 },
    ];
    expect(enterAt(nested, { index: 1, offset: 0 }).blocks[1]).toMatchObject({
      kind: 'item',
      indent: 0,
    });
    const top: Block[] = [{ kind: 'item', text: '', checked: false, indent: 0 }];
    expect(enterAt(top, { index: 0, offset: 0 }).blocks[0]).toEqual({
      kind: 'paragraph',
      text: '',
    });
  });
});

describe('backspaceAtStart', () => {
  it('outdents a nested item instead of turning it into a paragraph', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'A', checked: false, indent: 0 },
      { kind: 'item', text: 'B', checked: true, indent: 1 },
    ];
    const next = backspaceAtStart(blocks, { index: 1, offset: 0 });
    expect(next?.blocks[1]).toEqual({
      kind: 'item',
      text: 'B',
      checked: true,
      indent: 0,
    });
  });

  it('turns a top-level item into a paragraph and shifts children out', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'A', checked: true, indent: 0 },
      { kind: 'item', text: 'B', checked: false, indent: 1 },
    ];
    const next = backspaceAtStart(blocks, { index: 0, offset: 0 });
    expect(next?.blocks[0]).toEqual({ kind: 'paragraph', text: 'A' });
    expect(next?.blocks[1]).toMatchObject({ kind: 'item', indent: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteEdit.test.ts`

Expected: FAIL — `enterAt` / `backspaceAtStart` are not exported.

- [ ] **Step 3: Implement**

Add both functions to `noteEdit.ts`. Reuse `outdentSelection` and `toggleChecklist`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/noteEdit.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/noteEdit.ts src/lib/noteEdit.test.ts
git commit -m "feat(notes): Enter and Backspace match checklist list rules"
```

---

### Task 6: Insert, delete selection, paste

**Files:**
- Modify: `src/lib/noteEdit.ts`
- Modify: `src/lib/noteEdit.test.ts`

**Interfaces:**
- Consumes: `joinIntoLine`, `stripIncoming` from `noteCopy.ts`; `decodeBody`, `encodeBody` from `noteDoc.ts`
- Produces:
  - `export function ordered(a: DocCaret, b: DocCaret): [DocCaret, DocCaret]`
  - `export function deleteSelection(blocks: Block[], start: DocCaret, end: DocCaret): EditResult`
  - `export function insertText(blocks: Block[], caret: DocCaret, text: string): EditResult`
  - `export function pasteExternal(blocks: Block[], start: DocCaret, end: DocCaret, raw: string): EditResult`
  - `export function pasteInternal(blocks: Block[], start: DocCaret, end: DocCaret, fragment: Block[]): EditResult`

`ordered`: document order by `index`, then `offset`.

`deleteSelection`: same block → slice text. Different blocks → first block keeps its `kind`, text is `first.text.slice(0, start.offset) + last.text.slice(end.offset)`, drop blocks in between. Caret at the join. This is the “not a smashed hybrid” rule.

`insertText`: collapsed insert at caret. Does not create new blocks.

`pasteExternal`: `deleteSelection` if the range is not collapsed, then: if the caret block is an item, `insertText` with `joinIntoLine(raw)` (stays one item, same tick, same indent). If it is a paragraph, `stripIncoming`, split on newlines, split the current paragraph at the caret and insert those pieces as **paragraphs** (never as items).

`pasteInternal`: `deleteSelection` if needed, then split the caret block at offset (paragraph split, or item split with the suffix as a new block of the **same kind**, suffix unchecked if item — same as Enter mid-line), then insert `fragment` between the prefix and suffix. Preserve fragment kinds, ticks, and relative indent. Caret at the end of the inserted fragment.

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('deleteSelection', () => {
  it('keeps the first line type when a mix is deleted', () => {
    const blocks: Block[] = [
      { kind: 'paragraph', text: 'Ab' },
      { kind: 'item', text: 'Cd', checked: true, indent: 0 },
    ];
    const next = deleteSelection(
      blocks,
      { index: 0, offset: 1 },
      { index: 1, offset: 1 },
    );
    expect(next.blocks).toEqual([{ kind: 'paragraph', text: 'Ad' }]);
  });
});

describe('pasteExternal', () => {
  it('joins into an item and does not create new items', () => {
    const blocks: Block[] = [
      { kind: 'item', text: 'AB', checked: true, indent: 1 },
    ];
    const next = pasteExternal(
      blocks,
      { index: 0, offset: 1 },
      { index: 0, offset: 1 },
      'x\ny',
    );
    expect(next.blocks).toEqual([
      { kind: 'item', text: 'Ax yB', checked: true, indent: 1 },
    ]);
  });
});

describe('pasteInternal', () => {
  it('keeps ticks and nesting when pasting a family inside the note', () => {
    const blocks: Block[] = [{ kind: 'paragraph', text: '' }];
    const fragment: Block[] = [
      { kind: 'item', text: 'P', checked: true, indent: 0 },
      { kind: 'item', text: 'C', checked: false, indent: 1 },
    ];
    const next = pasteInternal(
      blocks,
      { index: 0, offset: 0 },
      { index: 0, offset: 0 },
      fragment,
    );
    expect(next.blocks[0]).toMatchObject({
      kind: 'item',
      text: 'P',
      checked: true,
    });
    expect(next.blocks[1]).toMatchObject({
      kind: 'item',
      text: 'C',
      indent: 1,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteEdit.test.ts`

Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement**

Add the functions to `noteEdit.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/noteEdit.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/noteEdit.ts src/lib/noteEdit.test.ts
git commit -m "feat(notes): paste into an item stays on that item"
```

---

### Task 7: Undo stack

**Files:**
- Create: `src/lib/noteHistory.ts`
- Create: `src/lib/noteHistory.test.ts`

**Interfaces:**
- Consumes: `Block`, `DocCaret`
- Produces:
  - `export interface NoteSnapshot { blocks: Block[]; caret: DocCaret }`
  - `export interface NoteHistory { past: NoteSnapshot[]; future: NoteSnapshot[] }`
  - `export const EMPTY_HISTORY: NoteHistory = { past: [], future: [] }`
  - `export function remember(history: NoteHistory, snapshot: NoteSnapshot): NoteHistory`
  - `export function undoTo(history: NoteHistory, current: NoteSnapshot): { history: NoteHistory; snapshot: NoteSnapshot } | null`
  - `export function redoTo(history: NoteHistory, current: NoteSnapshot): { history: NoteHistory; snapshot: NoteSnapshot } | null`

`remember` appends to `past` and clears `future`. `undoTo` returns `null` when `past` is empty; otherwise pops, pushes `current` onto `future`. `redoTo` is the reverse.

The editor (Task 10–11) calls `remember` once before tick / In / Out / convert / each typing run. Do not put the typing-run flag in this module.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { EMPTY_HISTORY, remember, undoTo, redoTo } from './noteHistory';
import type { NoteSnapshot } from './noteHistory';

const a: NoteSnapshot = {
  blocks: [{ kind: 'paragraph', text: 'A' }],
  caret: { index: 0, offset: 1 },
};
const b: NoteSnapshot = {
  blocks: [{ kind: 'item', text: 'A', checked: false, indent: 0 }],
  caret: { index: 0, offset: 1 },
};

describe('remember / undo / redo', () => {
  it('undoes one structural step and redoes it', () => {
    const remembered = remember(EMPTY_HISTORY, a);
    const undone = undoTo(remembered, b);
    expect(undone?.snapshot).toEqual(a);
    const redone = redoTo(undone!.history, undone!.snapshot);
    expect(redone?.snapshot).toEqual(b);
  });

  it('returns null when there is nothing to undo', () => {
    expect(undoTo(EMPTY_HISTORY, a)).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteHistory.test.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/lib/noteHistory.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/noteHistory.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/noteHistory.ts src/lib/noteHistory.test.ts
git commit -m "feat(notes): undo checklist actions as one step"
```

---

### Task 8: Shortcut helpers

**Files:**
- Modify: `src/lib/noteShortcut.ts`
- Modify: `src/lib/noteShortcut.test.ts`
- Modify: `src/components/notes/NotesHost.tsx` (pass `isContentEditable` into the helper)

**Interfaces:**
- Consumes: existing `isTypingTag`, `notesShortcut`
- Produces:
  - `export function isTypingElement(tagName: string, contentEditable: boolean): boolean`
  - `export function isChecklistHotkey(key: string, shift: boolean, ctrlOrMeta: boolean, alt: boolean): boolean`

`isTypingElement`: `isTypingTag(tagName) || contentEditable`.

`isChecklistHotkey`: `key === '9' && shift && ctrlOrMeta && !alt`.

In `NotesHost`, replace `isTypingTag(tagName)` with:

```ts
const target = event.target as { tagName?: string; isContentEditable?: boolean };
const typing = isTypingElement(
  target.tagName ?? '',
  target.isContentEditable === true,
);
```

- [ ] **Step 1: Write the failing tests** (append to `noteShortcut.test.ts`)

```ts
it('treats a contenteditable div as typing', () => {
  expect(isTypingElement('DIV', true)).toBe(true);
  expect(isTypingElement('DIV', false)).toBe(false);
});

it('matches Ctrl+Shift+9 and Cmd+Shift+9, not Alt', () => {
  expect(isChecklistHotkey('9', true, true, false)).toBe(true);
  expect(isChecklistHotkey('9', true, true, true)).toBe(false);
  expect(isChecklistHotkey('9', false, true, false)).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/noteShortcut.test.ts`

Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement and wire NotesHost**

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/noteShortcut.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/noteShortcut.ts src/lib/noteShortcut.test.ts src/components/notes/NotesHost.tsx
git commit -m "feat(notes): treat the editor as typing and bind checklist hotkey"
```

---

### Task 9: Strip and editor shell

**Files:**
- Create: `src/components/notes/NotesStrip.tsx`
- Create: `src/components/notes/NotesEditor.tsx`
- Modify: `src/components/notes/NotesPad.tsx`

**Interfaces:**
- Consumes: `decodeBody`, `encodeBody`, `toggleChecked`, `insertText`, `deleteSelection`, `canIndent`, `canOutdent`, `NOTE_SAVE_PAUSE_MS` path already in the pad
- Produces: visible strip + editor that saves encoded body through existing `updateBody`

There is no DOM test environment. Behaviour is pinned by Tasks 1–8; this task wires it. After this task a note still saves as one string.

**NotesStrip** (`'use client'`):

Props:

```ts
interface NotesStripProps {
  inWords: boolean;
  inChecklist: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  onToggle: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}
```

- Row `flex min-h-11 shrink-0 items-center border-b border-[var(--mt-border)]`.
- Checklist button always in the same slot: `min-h-11 min-w-11`, `aria-label="Checklist"`, `aria-pressed={inChecklist}`, `disabled={!inWords}`, lucide `ListChecks`. Colour `text-[var(--mt-text)]`; disabled uses muted.
- In and Out always rendered (never unmount) so the checklist button never moves. Use `invisible` when `!inChecklist` (visibility hidden, space kept), plus `aria-hidden={!inChecklist}` and `tabIndex={inChecklist ? 0 : -1}`. `disabled={!inChecklist || !canIndent}` / `!canOutdent`. Labels `Indent` / `Outdent`. Icons `IndentIncrease` / `IndentDecrease`.
- All tokens `--mt-*`. No hardcoded colours.

**NotesEditor** (`'use client'`):

Props: `body: string; disabled?: boolean; onChange: (body: string) => void; onCaret: (info: { inWords: boolean; inChecklist: boolean; canIndent: boolean; canOutdent: boolean }) => void` plus action refs or callbacks for strip: `onToggle`, `onIndent`, `onOutdent` called from strip via the pad.

This task only needs: render decoded blocks, type in a line, tick a square, write encoded body out.

- Each block is a row `flex items-start`. Item rows: checkbox button `min-h-11 min-w-11` with `onPointerDown={(e) => e.preventDefault()}` so focus stays in the text. Unchecked: lucide `Square`. Checked: `CheckSquare`. `aria-checked`. Click → `toggleChecked` → `onChange(encodeBody(...))`. Do not move caret.
- Item text: `text-[var(--mt-text)]` when unchecked; `text-[var(--mt-text-muted)] line-through` when checked.
- Indent: `style={{ paddingLeft: indent * 24 }}` with `const ITEM_INDENT_PX = 24` in this file (layout, not colour).
- Text: a `contenteditable` span per block, `aria-label="Note"` on the first / on the container. `onInput` reads `textContent`, `insertText`/`replace that block's text`, `onChange(encodeBody)`.
- Container: `mt-quiet-focus min-h-11 flex-1 overflow-auto bg-[var(--mt-surface)] p-3 text-[var(--mt-text)]`.
- `onFocus` / `onBlur` on the editor: report `inWords`. On caret in an item, report `inChecklist: true` and `canIndent` / `canOutdent` for the caret’s item index (if a range, use `selectedRoots` later; this task may use the caret item only).
- `key` the editor with the note id from the pad so switching tabs resets it.

**NotesPad:** keep tabs/rename/delete/save debounce. Replace the `<textarea>` with:

```tsx
<NotesStrip
  inWords={strip.inWords}
  inChecklist={strip.inChecklist}
  canIndent={strip.canIndent}
  canOutdent={strip.canOutdent}
  onToggle={() => editorRef.current?.toggle()}
  onIndent={() => editorRef.current?.indent()}
  onOutdent={() => editorRef.current?.outdent()}
/>
<NotesEditor
  key={active.id}
  body={active.body}
  onChange={updateBody}
  onCaret={setStrip}
/>
```

Strip state lives in the pad: `{ inWords: false, inChecklist: false, canIndent: false, canOutdent: false }`. Toggle/indent/outdent can be no-ops until Task 10 if the editor does not expose them yet — **prefer exposing them now** as functions that apply `toggleChecklist` / `indentSelection` / `outdentSelection` to the current selection (caret-only range is fine this task).

Do not call `onChange` on mount if `encodeBody(decodeBody(body)) === body`.

- [ ] **Step 1: Build Strip + Editor + pad wire**

No unit test (no DOM). Implement as specified.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no new errors in the files you touched. Pre-existing `@google/genai` errors (if any) are unrelated — do not “fix” them here.

- [ ] **Step 3: Commit**

```bash
git add src/components/notes/NotesStrip.tsx src/components/notes/NotesEditor.tsx src/components/notes/NotesPad.tsx
git commit -m "feat(notes): replace the typing box with a checklist editor"
```

---

### Task 10: Keys, IME, clipboard, undo in the editor

**Files:**
- Modify: `src/components/notes/NotesEditor.tsx`
- Modify: `src/components/notes/NotesStrip.tsx` only if a callback is missing

**Interfaces:**
- Consumes: `enterAt`, `backspaceAtStart`, `toggleChecklist`, `indentSelection`, `outdentSelection`, `pasteExternal`, `pasteInternal`, `copyOut`, `NOTE_CLIPBOARD_TYPE`, `decodeBody`, `encodeBody`, `remember`, `undoTo`, `redoTo`, `isChecklistHotkey`

Wire `onKeyDown` on the editor (not the pad rename field):

- If `event.isComposing` or `event.key === 'Process'`, return. Do not tick, convert, Enter, Backspace, In, Out, or undo during composition.
- `isChecklistHotkey` → preventDefault, `remember`, `toggleChecklist` on the selected block range.
- `Tab` / `Shift+Tab` when caret is on an item → preventDefault, `remember`, indent/outdent that selection.
- `Enter` → preventDefault, `remember`, `enterAt`.
- `Backspace` at offset 0 (collapsed) → `backspaceAtStart`; if non-null, preventDefault, `remember`, apply. Otherwise let the character delete happen via `onInput`.
- `Ctrl/Cmd+Z` → preventDefault, `undoTo`. `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` → `redoTo`.
- Before a typing `onInput` that is not composition: if not already in a typing run, `remember` current snapshot then set a `typingRun` flag. Clear `typingRun` before every structural op (tick, convert, indent, Enter, Backspace-at-start, paste, undo).

Clipboard:

- `copy` / `cut`: `preventDefault`. `text/plain` = `copyOut(selected blocks, sliced text on partial lines)`. Also `clipboardData.setData(NOTE_CLIPBOARD_TYPE, encodeBody(selected blocks as full blocks when the whole line is selected, or sliced item/paragraph copies))`. For a partial line, copy that slice as one block of the same kind (item keeps tick/indent). Cut = copy then `deleteSelection`.
- `paste`: `preventDefault`. If `clipboardData.getData(NOTE_CLIPBOARD_TYPE)` is non-empty, `decodeBody` that fragment (`decodeBody` on empty fragment: if `''` this would be one empty paragraph — **do not use `decodeBody` on empty**; if the MIME string is empty, treat as no internal payload). If internal payload present, `remember`, `pasteInternal`. Else `remember`, `pasteExternal` with `text/plain`.

Tick: `remember` then `toggleChecked`. Do not change caret. `preventDefault` on pointer down already in Task 9.

Selection range: map `window.getSelection()` to `DocCaret` start/end via each block’s contenteditable node. If mapping fails, fall back to collapsed caret on the focused block.

- [ ] **Step 1: Implement keys, IME guard, clipboard, undo**

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no new errors in files you touched.

- [ ] **Step 3: Run the whole unit suite**

Run: `npm test`

Expected: PASS for all existing and new `src/lib/**/*.test.ts` files.

- [ ] **Step 4: Commit**

```bash
git add src/components/notes/NotesEditor.tsx
git commit -m "feat(notes): checklist Enter, paste, and undo in the pad"
```

---

### Task 11: Human verification

**Files:**
- Create: `docs/superpowers/verification/2026-09-10-notes-checklist.md`

**Interfaces:** none

- [ ] **Step 1: Write the walk list**

Copy spec §8 into a verification file with a Pass/Fail column. Include every everyday item, the mixed-note check, and every typing case (Enter mid-line, multi-item selections, phone keyboard, IME) on **computer and phone**. Title it as a list to walk, not a completed run.

- [ ] **Step 2: Walk it in the real pad**

Open Notes from the running app. Do not claim done from a screenshot. Computer and a phone-width viewport (or a real phone). Record Pass/Fail. If something fails, write a failing unit test in `noteEdit.test.ts` / `noteDoc.test.ts` / `noteCopy.test.ts` first when the bug is a rule; fix; re-walk from that item.

- [ ] **Step 3: Commit the record**

```bash
git add docs/superpowers/verification/2026-09-10-notes-checklist.md
git commit -m "docs: record the notes checklist verification walk"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Checklists only, no new library, same `body` | Global + Task 1 |
| Private marks, old notes, broken marks | Task 1 |
| Cloud/mapping does not tidy body | Task 2 |
| Copy-out `[x]` / `[ ]` + two spaces | Task 3 |
| Paste-in strips private marks; `[x]` stays characters | Task 3, 6 |
| Toggle, mixed selection, family indent, parent/child ticks independent | Task 4 |
| Enter / Backspace rules | Task 5 |
| Paste into an item stays one item | Task 6 |
| Internal paste keeps ticks | Task 6 |
| Undo one step | Task 7, 10 |
| Ctrl+Shift+9, N still types in the editor | Task 8 |
| Strip reserved In/Out, grey states, squares, strike | Task 9 |
| Click tick without moving caret, IME, clipboard | Task 10 |
| §8 walk including mixed note and risky typing | Task 11 |
| No schema / save-layer change | Task 2 + Global |

## Out of scope (do not build)

- Bullets, numbers, bold, colours, images
- Notes search / preview / export
- Tying items to `/todo`
- Protecting an old app version from showing marks
