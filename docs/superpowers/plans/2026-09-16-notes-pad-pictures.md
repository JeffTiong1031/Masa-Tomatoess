# Notes Pad Pictures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Jeff put pictures in a notepad: paste or pick a file, show them in the pad, resize by a corner, sit them in line or on top of the words, delete with Backspace. Pictures live in the same note body string that already syncs. Files-page cards stay words only.

**Architecture:** A picture is a third `Block` kind in `noteDoc.ts`, stored as one private-mark line plus a webp data URL. All sit / size / place / insert / delete / Backspace rules are pure functions in `src/lib/` so Vitest can pin them (no DOM). The editor is the only place that draws, pastes files, or shrinks pixels. No new table, no Dexie change, no extra Supabase column. Undo already snapshots the body; picture edits go through the same `commit`.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript strict, Tailwind v4, Zustand persist, Dexie, Supabase `notes.body` text, Vitest, lucide-react. No new dependencies. Reuse `FULL_MAX_EDGE` / `fitWithin` / `toBase64` from `mealImage.ts` (800 long side, webp 0.82).

**Spec:** [docs/superpowers/specs/2026-09-16-notes-pad-pictures-design.md](../specs/2026-09-16-notes-pad-pictures-design.md)

## Global Constraints

- **Never hardcode a colour.** Components reference `--mt-*` semantic tokens only. Raw `--mac-*` hues stay inside `globals.css`. Notes already has mint `--mt-accent`; do not invent a second picture colour.
- **Do not write comments.** Names and structure carry the meaning.
- **No defensive programming.** No guards for states the types exclude.
- **No `instanceof`, no `typeof` branching** to discriminate shapes. `Block` is a discriminated union; switch on `kind`. Picture vs words is `kind`, never a string sniff of the data URL at the call site.
- **Handle exceptions only where there is something to do about them.** IndexedDB / network already catch. Pure functions in `noteDoc` / `noteEdit` / `noteCopy` / `noteFiles` do not. Canvas shrink may fail; that path shows the empty frame.
- Server Components by default; `'use client'` only on the leaf that needs it. Strip, pad, and editor already are client leaves.
- Touch targets at least 44px (`min-h-11 min-w-11`), including the picture button, sit switch, and each resize corner.
- **Commits are Jeff's alone.** Never add a `Co-Authored-By` trailer or any generated-with attribution.
- Next.js 16 differs from training data. This feature adds **no new route**. Do not rewrite App Router files.
- **Do not** add a library (no TipTap, no extra image cropper).
- **Do not** change the notes table, Dexie schema, `noteLocal.ts` write shape, `noteRepo.ts` mapping, or `noteSync.ts` merge. Body stays one string. Pictures ride inside it.
- Pause after typing before save stays `NOTE_SAVE_PAUSE_MS = 400`.
- Vitest is pure functions only. No DOM, no component render. Resize-on-canvas is pinned by `NOTE_PIC_MAX_EDGE === FULL_MAX_EDGE` and `fitWithin` tests, not by drawing.
- Branch: cut `feat/notes-pad-pictures` from current `main` before the first commit of Task 1.
- PowerShell: `&&` is invalid. Chain with `;` or separate calls. Commits use `git.exe` and a here-string, never a `Co-Authored-By` trailer:

```
git.exe add -A
git.exe commit -m @"
message

body
"@
```

## File map

| File | Responsibility |
|---|---|
| `src/lib/noteDoc.ts` | `PictureBlock`, pic-line encode/decode, `WordBlock`, empty frame |
| `src/lib/noteDoc.test.ts` | old notes, round-trip sit/size/place/src, broken pic line → empty frame |
| `src/lib/notePicture.ts` | mime check, max-edge pin, clamp width/place, default picture, sit switch, size, place |
| `src/lib/notePicture.test.ts` | mime, 800 pin, clamps, sit restores place, default inline full width |
| `src/lib/notePictureFile.ts` | client shrink: `createImageBitmap` + canvas webp 0.82 via `fitWithin` / `toBase64` |
| `src/lib/noteFiles.ts` | `notePreview` / `suggestedTitle` skip picture rows |
| `src/lib/noteFiles.test.ts` | preview and title ignore pictures, keep words |
| `src/lib/noteCopy.ts` | `copyOut` omits picture rows (no data URL on the clipboard) |
| `src/lib/noteCopy.test.ts` | copy skips pictures, keeps neighbouring words |
| `src/lib/noteEdit.ts` | `blockLength`, `insertPicture`, Backspace on picture, sit/size/place, exhaustive `kind` switches |
| `src/lib/noteEdit.test.ts` | insert, Backspace one then two, sit, size, place, non-picture paste |
| `src/lib/notePadUi.test.ts` | strip picture button, editor paste-image / file input / corners / sit switch |
| `src/components/notes/NotesStrip.tsx` | picture button after Underline, before spacing |
| `src/components/notes/NotesEditor.tsx` | render, paste image, pick file, ring, corners, sit switch, front overlay drag |
| `src/components/notes/NotesPad.tsx` | wire `insertPicture` |
| `docs/superpowers/specs/2026-09-16-notes-pad-pictures-design.md` | status → Approved in Task 1 |
| `docs/superpowers/verification/2026-09-16-notes-pad-pictures.md` | human walk from spec §6 |

Encode format (lock this; do not invent another):

- Picture line: `'\u001E' + 'pic/' + sit + '/' + width + '/' + x + '/' + y + '\u001F' + src`
- `sit` is `'inline'` or `'front'`
- `width`, `x`, `y` are decimal fractions `0`–`1` (width also has a floor of `0.15`)
- `src` is a `data:image/webp;base64,...` string, or `''` for the empty frame
- Item line unchanged: `'\u001E' + ('1' \| '0') + '/' + indent + '\u001F' + text`
- Paragraph line unchanged: the words (with run marks)
- Body: lines joined with `'\n'`
- Old notes with no `pic/` lines still decode as they do now
- A line that starts `pic/` but cannot be read becomes the empty frame, not a crash and not a paragraph of junk

Default new picture:

```ts
{
  kind: 'picture',
  sit: 'inline',
  width: 1,
  x: 0.5,
  y: 0.15,
  src,
}
```

Caret on a picture is always `{ index, offset: 0 }`. `blockLength(picture) === 0`. Arrow keys step to the neighbouring block. Backspace while the caret is on the picture removes that row.

First Backspace at the start of the following paragraph moves the caret onto the picture. Second Backspace deletes it.

---

### Task 1: Encode and decode pictures

**Files:**
- Modify: `src/lib/noteDoc.ts`
- Modify: `src/lib/noteDoc.test.ts`
- Modify: `docs/superpowers/specs/2026-09-16-notes-pad-pictures-design.md` (status line only: `Awaiting review` → `Approved`)

**Interfaces:**
- Consumes: existing `NOTE_MARK_START` / `NOTE_MARK_SEP`
- Produces:
  - `export type PictureSit = 'inline' | 'front'`
  - `export type PictureBlock = { kind: 'picture'; sit: PictureSit; width: number; x: number; y: number; src: string }`
  - `export type WordBlock = ParagraphBlock | ItemBlock`
  - `export type Block = WordBlock | PictureBlock`
  - `export function emptyPicture(): PictureBlock`
  - `withVisible(block: WordBlock, ...)` — pictures never go through it
  - `decodeLine` / `encodeLine` handle `kind: 'picture'`
  - `encodeBody` of a lone empty paragraph is still `''`. A lone empty frame encodes as a pic line, not as `''`.

- [ ] **Step 1: Cut the branch and mark the spec approved**

```
git.exe checkout main
git.exe checkout -b feat/notes-pad-pictures
```

In the spec, change `**Status:** Awaiting review` to `**Status:** Approved`.

- [ ] **Step 2: Write the failing tests**

Add to `src/lib/noteDoc.test.ts`:

```ts
import {
  NOTE_MARK_START,
  NOTE_MARK_SEP,
  decodeBody,
  decodeLine,
  emptyPicture,
  encodeBody,
  encodeLine,
} from './noteDoc';

const SRC = 'data:image/webp;base64,AAA';

describe('picture lines', () => {
  it('round-trips sit, size, place, and the picture bytes', () => {
    const block = {
      kind: 'picture' as const,
      sit: 'front' as const,
      width: 0.4,
      x: 0.2,
      y: 0.7,
      src: SRC,
    };
    expect(decodeBody(encodeBody([block]))).toEqual([block]);
  });

  it('keeps an old note with no pictures the same', () => {
    expect(encodeBody(decodeBody('hello\nthere'))).toBe('hello\nthere');
  });

  it('opens a broken picture line as the empty frame', () => {
    expect(decodeLine(`${NOTE_MARK_START}pic/nope${NOTE_MARK_SEP}x`)).toEqual(
      emptyPicture(),
    );
  });

  it('opens a missing src as the empty frame with the sit kept', () => {
    const raw = `${NOTE_MARK_START}pic/inline/1/0.5/0.15${NOTE_MARK_SEP}`;
    expect(decodeLine(raw)).toEqual({
      kind: 'picture',
      sit: 'inline',
      width: 1,
      x: 0.5,
      y: 0.15,
      src: '',
    });
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npx vitest run src/lib/noteDoc.test.ts`
Expected: FAIL — `emptyPicture` / `kind: 'picture'` are not exported yet.

- [ ] **Step 4: Write the encode/decode**

Add types and helpers. `PIC_LINE` is tried before `ITEM_LINE`. A line that matches `^NOTE_MARK_START pic/` but fails `PIC_LINE` becomes `emptyPicture()`. Clamp is **not** in `noteDoc`; store what was written. Clamps live in `notePicture.ts` at edit time.

```ts
export type PictureSit = 'inline' | 'front';

export type PictureBlock = {
  kind: 'picture';
  sit: PictureSit;
  width: number;
  x: number;
  y: number;
  src: string;
};

export type WordBlock = ParagraphBlock | ItemBlock;
export type Block = WordBlock | PictureBlock;

export function emptyPicture(): PictureBlock {
  return {
    kind: 'picture',
    sit: 'inline',
    width: 1,
    x: 0.5,
    y: 0.15,
    src: '',
  };
}

const PIC_LINE = new RegExp(
  `^${NOTE_MARK_START}pic/(inline|front)/(\\d+(?:\\.\\d+)?)/(\\d+(?:\\.\\d+)?)/(\\d+(?:\\.\\d+)?)${NOTE_MARK_SEP}(.*)$`,
);

const PIC_PREFIX = `${NOTE_MARK_START}pic/`;
```

`decodeLine`: if `raw.startsWith(PIC_PREFIX)` and `PIC_LINE` misses, return `emptyPicture()`. If it hits, return the five fields (`src` may be `''`).

`encodeLine` `case 'picture'`:

```ts
return `${NOTE_MARK_START}pic/${block.sit}/${block.width}/${block.x}/${block.y}${NOTE_MARK_SEP}${block.src}`;
```

`withVisible` takes `WordBlock`. `encodeBody` empty-note check stays paragraph-only.

Adding `kind: 'picture'` will make every `switch (block.kind)` in `noteEdit.ts` / `noteCopy.ts` / `noteFiles.ts` fail `tsc` until later tasks. **Do not** add dummy `default` arms. Those files are the next tasks. If you need a green typecheck before Task 5, add `case 'picture':` arms that match the behaviour written in Task 5, then write the tests in Task 5 so they fail for the *wrong* behaviour and you correct them. Prefer finishing Tasks 2–5 in one sitting so `npx tsc --noEmit` is green before you stop.

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx vitest run src/lib/noteDoc.test.ts`
Expected: PASS. Existing old-note tests still pass.

- [ ] **Step 6: Commit**

```
git.exe add src/lib/noteDoc.ts src/lib/noteDoc.test.ts docs/superpowers/specs/2026-09-16-notes-pad-pictures-design.md
git.exe commit -m @"
Add picture lines to the note body format.

A picture is a third kind of line in the same string that already
syncs, so the other computer sees it when the note arrives.
"@
```

---

### Task 2: Cards skip pictures

**Files:**
- Modify: `src/lib/noteFiles.ts`
- Modify: `src/lib/noteFiles.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/noteFiles.test.ts`:

```ts
it('skips picture rows and uses the words around them', () => {
  const body = encodeBody([
    {
      kind: 'picture',
      sit: 'inline',
      width: 1,
      x: 0.5,
      y: 0.15,
      src: 'data:image/webp;base64,AAA',
    },
    { kind: 'paragraph', text: 'Eggs' },
  ]);
  expect(notePreview(body)).toEqual([{ text: 'Eggs', checked: null }]);
  expect(suggestedTitle(body)).toBe('Eggs');
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/noteFiles.test.ts`
Expected: FAIL — `block.text` is not on a picture, or preview tries to show the data URL.

- [ ] **Step 3: Skip picture rows**

In `notePreview`, switch on `block.kind`. `case 'picture':` return no preview line. Words and checklist rows stay as they are.

```ts
export function notePreview(body: string, limit = 4): PreviewLine[] {
  return decodeBody(body)
    .flatMap((block): PreviewLine[] => {
      switch (block.kind) {
        case 'picture':
          return [];
        case 'item':
          return [{ text: block.text.trim(), checked: block.checked }];
        case 'paragraph': {
          const text = block.text.trim();
          return text === '' ? [] : [{ text, checked: null }];
        }
      }
    })
    .slice(0, limit);
}
```

Keep the existing checklist-empty-line rule: an item with blank text still shows because `checked !== null`. The `flatMap` above drops empty paragraphs the same as today’s `filter`.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/noteFiles.test.ts`
Expected: PASS, including the old preview tests.

- [ ] **Step 5: Commit**

```
git.exe add src/lib/noteFiles.ts src/lib/noteFiles.test.ts
git.exe commit -m @"
Keep note cards on words when a pad has pictures.

The files page is still a list of titles and first lines, not a
gallery, so preview and the suggested name skip picture rows.
"@
```

---

### Task 3: Copy skips pictures

**Files:**
- Modify: `src/lib/noteCopy.ts`
- Modify: `src/lib/noteCopy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('skips picture rows so the clipboard stays words', () => {
  expect(
    copyOut([
      { kind: 'paragraph', text: 'Above' },
      {
        kind: 'picture',
        sit: 'inline',
        width: 1,
        x: 0.5,
        y: 0.15,
        src: 'data:image/webp;base64,AAA',
      },
      { kind: 'paragraph', text: 'Below' },
    ]),
  ).toBe('Above\nBelow');
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/noteCopy.test.ts`
Expected: FAIL — switch is not exhaustive, or it dumps the data URL.

- [ ] **Step 3: Omit picture rows**

```ts
.map((block) => {
  switch (block.kind) {
    case 'paragraph':
      return stripMarks(block.text);
    case 'item':
      return (
        ' '.repeat(block.indent * 2) +
        (block.checked ? '[x] ' : '[ ] ') +
        stripMarks(block.text)
      );
    case 'picture':
      return null;
  }
})
.filter((line): line is string => line !== null)
```

Do not copy the bytes. Paste-inside-the-pad of a Masa fragment still uses `NOTE_CLIPBOARD_TYPE` (encoded body), which **does** carry pictures via `pasteInternal`. This test is plain `text/plain` copy-out only.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/noteCopy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git.exe add src/lib/noteCopy.ts src/lib/noteCopy.test.ts
git.exe commit -m @"
Leave pictures out of plain copied text.

Pasting into another app should not dump a data URL. Inside the
pad, the private Masa clipboard still carries the whole fragment.
"@
```

---

### Task 4: Picture helpers (mime, size, sit)

**Files:**
- Create: `src/lib/notePicture.ts`
- Create: `src/lib/notePicture.test.ts`

**Interfaces:**
- Consumes: `FULL_MAX_EDGE` from `mealImage.ts`; `PictureBlock` from `noteDoc.ts`
- Produces:
  - `export const NOTE_PIC_MAX_EDGE = FULL_MAX_EDGE`
  - `export const NOTE_PIC_MIN_WIDTH = 0.15`
  - `export function isPictureMime(type: string): boolean`
  - `export function defaultPicture(src: string): PictureBlock`
  - `export function clampPictureWidth(width: number): number`
  - `export function clampPlace(n: number): number`
  - `export function switchPictureSit(block: PictureBlock): PictureBlock`
  - `export function sizePicture(block: PictureBlock, width: number): PictureBlock`
  - `export function placePicture(block: PictureBlock, x: number, y: number): PictureBlock`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { FULL_MAX_EDGE, fitWithin } from './mealImage';
import { emptyPicture } from './noteDoc';
import {
  NOTE_PIC_MAX_EDGE,
  clampPictureWidth,
  clampPlace,
  defaultPicture,
  isPictureMime,
  placePicture,
  sizePicture,
  switchPictureSit,
} from './notePicture';

describe('note picture shrink rule', () => {
  it('uses the same 800 long-side cap as meals', () => {
    expect(NOTE_PIC_MAX_EDGE).toBe(800);
    expect(NOTE_PIC_MAX_EDGE).toBe(FULL_MAX_EDGE);
  });

  it('leaves a smaller photo alone', () => {
    expect(fitWithin(640, 480, NOTE_PIC_MAX_EDGE)).toEqual({
      width: 640,
      height: 480,
    });
  });
});

describe('isPictureMime', () => {
  it('accepts image types and rejects the rest', () => {
    expect(isPictureMime('image/png')).toBe(true);
    expect(isPictureMime('image/webp')).toBe(true);
    expect(isPictureMime('text/plain')).toBe(false);
    expect(isPictureMime('application/pdf')).toBe(false);
  });
});

describe('sit and size', () => {
  it('defaults to in line, full width, last place remembered', () => {
    expect(defaultPicture('data:image/webp;base64,AAA')).toEqual({
      kind: 'picture',
      sit: 'inline',
      width: 1,
      x: 0.5,
      y: 0.15,
      src: 'data:image/webp;base64,AAA',
    });
  });

  it('switches in line to on top and back without losing place', () => {
    const placed = placePicture(defaultPicture('x'), 0.2, 0.7);
    const front = switchPictureSit(placed);
    expect(front.sit).toBe('front');
    expect(front.x).toBe(0.2);
    expect(front.y).toBe(0.7);
    expect(switchPictureSit(front)).toEqual(placed);
  });

  it('clamps width and place', () => {
    expect(clampPictureWidth(0)).toBe(0.15);
    expect(clampPictureWidth(2)).toBe(1);
    expect(clampPlace(-1)).toBe(0);
    expect(clampPlace(2)).toBe(1);
    expect(sizePicture(emptyPicture(), 0.4).width).toBe(0.4);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/notePicture.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
export function isPictureMime(type: string): boolean {
  return type.startsWith('image/');
}

export function switchPictureSit(block: PictureBlock): PictureBlock {
  switch (block.sit) {
    case 'inline':
      return { ...block, sit: 'front' };
    case 'front':
      return { ...block, sit: 'inline' };
  }
}
```

`clampPictureWidth`: `Math.min(1, Math.max(NOTE_PIC_MIN_WIDTH, width))`.
`clampPlace`: `Math.min(1, Math.max(0, n))`.
`sizePicture` / `placePicture` write the clamped numbers, keep the other fields.

Do **not** put canvas code here. Vitest cannot draw.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/notePicture.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git.exe add src/lib/notePicture.ts src/lib/notePicture.test.ts
git.exe commit -m @"
Pin note picture size and sit as pure rules.

Huge photos share meals' 800-pixel cap, and each picture remembers
whether it sits in line or on top without the editor guessing.
"@
```

---

### Task 5: Insert, Backspace, sit, size, place in the editor model

**Files:**
- Modify: `src/lib/noteEdit.ts`
- Modify: `src/lib/noteEdit.test.ts`

This is the task that makes `npx tsc --noEmit` green. Every `switch (block.kind)` must name `picture`. No `default`. No `.text` on a `Block` without switching.

**Lock these rules:**

| Function | Picture behaviour |
|---|---|
| `blockLength` | `0` for picture, `text.length` for words |
| `extendCaret` | uses `blockLength`; ArrowLeft into a picture lands at offset `0` |
| `insertPicture` | splits the current word block at the caret (same split as Enter), splices `defaultPicture(src)` between the two halves; if caret is already on a picture, insert after it; caret moves onto the new picture |
| `deleteSelection` | a range on one picture removes that row; if nothing remains, leave one empty paragraph |
| `backspaceAtStart` on picture | delete that row; caret at end of the previous block (`blockLength`), or `{0,0}` if it was first |
| `backspaceAtStart` on a paragraph/item at offset 0 whose previous is a picture | **move** caret onto that picture, do not join, do not delete |
| `insertText` / `pasteExternal` / marks / Enter on a picture | treat like sitting *after* it: `insertText` makes a new paragraph after the picture with those words; `enterAt` inserts an empty paragraph after; marks no-op (`return { blocks, caret }`); `pasteExternal` of words inserts after |
| `pasteInternal` | pictures in the fragment stay pictures; caret offset uses `blockLength` of the last inserted block |
| `familyEnd` / `canIndent` / `canOutdent` / `selectedRoots` | picture is a leaf like a paragraph: `familyEnd` = index, indent/outdent false, not a checklist root |
| `toggleChecked` / `toggleChecklist` | picture is not an item; leave it |
| `typeOverRange` | delete then insert; deleting a picked picture then typing is how replace works |

- [ ] **Step 1: Write the failing tests** (add to `noteEdit.test.ts`)

```ts
import {
  backspaceAtStart,
  insertPicture,
  placePictureAt,
  sizePictureAt,
  switchPictureSitAt,
} from './noteEdit';
import { defaultPicture } from './notePicture';

const pic = defaultPicture('data:image/webp;base64,AAA');

describe('insertPicture', () => {
  it('drops a new picture on its own row at the caret', () => {
    const result = insertPicture(
      [{ kind: 'paragraph', text: 'Hi there' }],
      { index: 0, offset: 2 },
      pic.src,
    );
    expect(result.blocks).toEqual([
      { kind: 'paragraph', text: 'Hi' },
      pic,
      { kind: 'paragraph', text: ' there' },
    ]);
    expect(result.caret).toEqual({ index: 1, offset: 0 });
  });
});

describe('backspace on a picture', () => {
  it('removes a picked picture', () => {
    const blocks: Block[] = [
      { kind: 'paragraph', text: 'Hi' },
      pic,
      { kind: 'paragraph', text: 'there' },
    ];
    const result = backspaceAtStart(blocks, { index: 1, offset: 0 });
    expect(result?.blocks).toEqual([
      { kind: 'paragraph', text: 'Hi' },
      { kind: 'paragraph', text: 'there' },
    ]);
    expect(result?.caret).toEqual({ index: 0, offset: 2 });
  });

  it('first Backspace on the next line moves onto the picture', () => {
    const blocks: Block[] = [
      pic,
      { kind: 'paragraph', text: 'there' },
    ];
    const result = backspaceAtStart(blocks, { index: 1, offset: 0 });
    expect(result?.blocks).toEqual(blocks);
    expect(result?.caret).toEqual({ index: 0, offset: 0 });
  });
});

describe('sit switch', () => {
  it('flips in line to on top and restores the last place', () => {
    const placed = { ...pic, x: 0.2, y: 0.7 };
    const blocks: Block[] = [placed];
    const front = switchPictureSitAt(blocks, 0);
    expect(front[0]).toMatchObject({ sit: 'front', x: 0.2, y: 0.7 });
    expect(switchPictureSitAt(front, 0)[0]).toEqual(placed);
  });
});

describe('paste of words does not become a picture', () => {
  it('keeps pasteExternal on words', () => {
    const result = pasteExternal(
      [{ kind: 'paragraph', text: '' }],
      { index: 0, offset: 0 },
      { index: 0, offset: 0 },
      'hello',
    );
    expect(result.blocks.some((block) => block.kind === 'picture')).toBe(false);
    expect(result.blocks[0]).toMatchObject({ kind: 'paragraph', text: 'hello' });
  });
});
```

Also add: `sizePictureAt(blocks, 0, 0.4)` writes `width: 0.4`; `placePictureAt` writes `x`/`y`; `deleteSelection` on a lone picture leaves `[{ kind: 'paragraph', text: '' }]`.

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run src/lib/noteEdit.test.ts`
Expected: FAIL — `insertPicture` missing; `backspaceAtStart` tries `block.text` on a picture.

- [ ] **Step 3: Implement**

Add:

```ts
export function blockLength(block: Block): number {
  switch (block.kind) {
    case 'picture':
      return 0;
    case 'paragraph':
    case 'item':
      return block.text.length;
  }
}

export function insertPicture(
  blocks: Block[],
  caret: DocCaret,
  src: string,
): EditResult { /* split like enterAt, splice defaultPicture(src) */ }

export function switchPictureSitAt(blocks: Block[], index: number): Block[] {
  const block = blocks[index];
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next[index] = switchPictureSit(block);
      return next;
    }
    case 'paragraph':
    case 'item':
      return blocks;
  }
}

export function sizePictureAt(
  blocks: Block[],
  index: number,
  width: number,
): Block[] { /* sizePicture when kind is picture */ }

export function placePictureAt(
  blocks: Block[],
  index: number,
  x: number,
  y: number,
): Block[] { /* placePicture when kind is picture */ }
```

`backspaceAtStart` must switch the **previous** block when joining a paragraph: `case 'picture':` move caret; `case 'paragraph'` / `case 'item':` existing join (`concatVisible` only on word blocks).

`deleteSelection` / `insertText` / `enterAt` / `pasteExternal` / `pasteInternal` / `selectionHasMark` / `toggleMarkInRange` / `extendCaret`: switch, never read `.text` on a picture.

`pasteInternal` caret:

```ts
offset: blockLength(inserted[inserted.length - 1])
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/lib/noteEdit.test.ts`
Expected: PASS, including old checklist / paste tests.

Run: `npx tsc --noEmit`
Expected: PASS. If a `kind` switch elsewhere still misses `picture`, add the arm in this task (search `switch (block.kind)` and `.text` on `Block`).

- [ ] **Step 5: Commit**

```
git.exe add src/lib/noteEdit.ts src/lib/noteEdit.test.ts
git.exe commit -m @"
Let the pad insert, move, size, and Backspace pictures.

Each picture is its own row in the note, and Backspace takes it
out the same way it takes out a word once the caret is on it.
"@
```

---

### Task 6: Picture button on the formatting row

**Files:**
- Modify: `src/components/notes/NotesStrip.tsx`
- Modify: `src/components/notes/NotesPad.tsx`
- Modify: `src/components/notes/NotesEditor.tsx` (`NotesEditorHandle.insertPicture` + hidden file input)
- Create: `src/lib/notePictureFile.ts`
- Modify: `src/lib/notePadUi.test.ts`

The strip button does not receive a `File`. It asks the editor to open the picker. The editor owns the hidden `<input type="file" accept="image/*">`.

- [ ] **Step 1: Write the failing source-read tests**

Add a describe in `notePadUi.test.ts`:

```ts
describe('notes pad pictures', () => {
  it('puts a picture button after underline, before spacing', () => {
    expect(STRIP).toContain('aria-label="Add a picture"');
    expect(STRIP.indexOf('aria-label="Underline"')).toBeLessThan(
      STRIP.indexOf('aria-label="Add a picture"'),
    );
    expect(STRIP.indexOf('aria-label="Add a picture"')).toBeLessThan(
      STRIP.indexOf('Line and paragraph spacing'),
    );
    expect(PAD).toContain('editorRef.current?.insertPicture()');
    expect(EDITOR).toContain('accept="image/*"');
    expect(EDITOR).toContain('insertPicture(');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/notePadUi.test.ts`
Expected: FAIL — label missing.

- [ ] **Step 3: Implement the door, not the drawing**

`notePictureFile.ts` (client-safe, imported only from the editor):

```ts
import { fitWithin, toBase64 } from './mealImage';
import { NOTE_PIC_MAX_EDGE } from './notePicture';

const WEBP_QUALITY = 0.82;

export async function shrinkNotePicture(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(
    bitmap.width,
    bitmap.height,
    NOTE_PIC_MAX_EDGE,
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((next) => resolve(next!), 'image/webp', WEBP_QUALITY);
  });
  return `data:image/webp;base64,${toBase64(await blob.arrayBuffer())}`;
}
```

If `createImageBitmap` or `toBlob` fails, the editor inserts `defaultPicture('')` (empty frame). Catch only there.

`NotesEditorHandle`:

```ts
insertPicture: () => void;
```

That method clicks the hidden file input. `onChange` on the input: if `isPictureMime(file.type)`, shrink, `insertPicture(blocks, caret, src)`, `rememberCurrent()`, `commit`. If the file is not a picture, do nothing (do not insert a frame).

Strip: `Image` from `lucide-react`, `aria-label="Add a picture"`, `min-h-11 min-w-11`, `onPointerDown` preventDefault like Bold, `disabled={!inWords}` is **wrong** for pictures — the button stays enabled whenever the pad is editing. Pass `onInsertPicture`. Place it after Underline, before the spacing `<label>`.

Pad: `onInsertPicture={() => editorRef.current?.insertPicture()}`.

Do not render `<img>` yet. A picture block can still show as an empty min-h-11 row so layout does not crash: `case 'picture':` return a `div` with `min-h-11`, no image. Drawing is Task 7.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/notePadUi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git.exe add src/components/notes/NotesStrip.tsx src/components/notes/NotesPad.tsx src/components/notes/NotesEditor.tsx src/lib/notePictureFile.ts src/lib/notePadUi.test.ts
git.exe commit -m @"
Add a picture button that opens the file picker.

The formatting row is how you put a picture in, same place as
bold and lists, and only image files are offered.
"@
```

---

### Task 7: Draw, paste, resize, sit on top, drag

**Files:**
- Modify: `src/components/notes/NotesEditor.tsx`
- Modify: `src/lib/notePadUi.test.ts`

This is the only DOM-heavy task. Keep movement maths in `placePicture` / `sizePicture`. The editor converts pointer deltas to fractions of the writing column.

**What you will see:**

- In line: the picture is a block in the list, width `width * 100%` of the writing column, `height: auto`.
- On top: a 0-height placeholder keeps the block index in the list so the caret can still land on it; the visible `<img>` is `absolute` inside the editor’s `relative` wrap, `left: x * 100%`, `top: y * 100%`, `width: width * 100%` of the wrap, `pointer-events` on. Words sit behind it. It does not push rows apart.
- Empty `src`: a `min-h-11` frame, `border border-[var(--mt-border)]`, no `<img>`.
- Picked (caret on that index, or tap): `outline` / ring using `var(--mt-accent)`, four corner handles `min-h-11 min-w-11`, sit switch on the picture (`aria-label="Sit in front of text"` when inline, `aria-label="Sit in line with words"` when front). No bin button.
- Corner pointer: rememberCurrent once on down, `sizePictureAt` on move, commit. No pinch. `touch-action: none` on handles.
- Front drag on the picture body (not a corner): rememberCurrent on down, `placePictureAt` on move. Clamp with `clampPlace`.
- Tap picture: `preventDefault` on the img so the contenteditable caret moves onto `{ index, 0 }` via `applyRange`.
- Paste: **before** the text/internal path, if `clipboardData.files` or `items` has `image/*`, preventDefault, shrink the first image, `insertPicture`. If it is only words, existing paste stays. Never insert a picture from `text/plain`.
- Broken decode (`src === ''`): empty frame, Backspace still deletes the row.
- Undo: insert, resize, move, sit-switch, delete all go through `rememberCurrent()` then `commit`, so history already works. Do not add a second stack.

- [ ] **Step 1: Write the failing source-read tests**

```ts
it('draws pictures, pastes images first, and resizes from a corner', () => {
  expect(EDITOR).toContain("block.kind === 'picture'");
  expect(EDITOR).toContain('Sit in front of text');
  expect(EDITOR).toContain('Sit in line with words');
  expect(EDITOR).toContain('isPictureMime(');
  expect(EDITOR).toContain('shrinkNotePicture(');
  expect(EDITOR).toContain('sizePictureAt(');
  expect(EDITOR).toContain('placePictureAt(');
  expect(EDITOR).toContain('switchPictureSitAt(');
  expect(EDITOR.indexOf('isPictureMime(')).toBeLessThan(
    EDITOR.indexOf('NOTE_CLIPBOARD_TYPE'),
  );
});
```

The paste-order assertion is: the image mime check in `onPaste` appears before the internal clipboard read. If you put the mime check in a helper called from `onPaste`, assert that helper is called before `getData(NOTE_CLIPBOARD_TYPE)`.

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/notePadUi.test.ts`
Expected: FAIL.

- [ ] **Step 3: Render and wire**

Map blocks with an exhaustive switch. Word rows keep today’s contenteditable span. Picture rows are **not** contenteditable.

The editor wrap (the `relative` div that already holds the lines) is the place fraction parent. Front pictures portal *inside* that wrap, not `fixed` to the window, so a wider or narrower pad still finds them.

Keyboard: when caret is on a picture, the existing Backspace-at-start path calls `backspaceAtStart`. Make sure the keydown handler still does that when `blockLength` is 0 (today it already calls `backspaceAtStart` at offset 0). Do not add a bin.

`inWords` for bold/underline: false when the caret is on a picture (strip already uses caret info). Picture button stays enabled.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/lib/notePadUi.test.ts src/lib/noteEdit.test.ts src/lib/noteDoc.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git.exe add src/components/notes/NotesEditor.tsx src/lib/notePadUi.test.ts
git.exe commit -m @"
Show notepad pictures and let you paste, resize, and float them.

A picture can sit in its row or on top of the words, and a corner
drag is the only way to resize on phone and computer.
"@
```

---

### Task 8: Verification walk

**Files:**
- Create: `docs/superpowers/verification/2026-09-16-notes-pad-pictures.md`

- [ ] **Step 1: Write the walk** (plain English, what Jeff sees)

```md
# Notes pad pictures — check

Phone and computer. Wallpaper off so cream is behind the pad.

## Put one in
- [ ] Open a note. Formatting row has a picture button after Underline.
- [ ] Press it. The file picker offers pictures only.
- [ ] Pick a photo. It appears on its own row, as wide as the writing column.
- [ ] Copy a picture from somewhere else and paste. Same: own row.
- [ ] Paste words. Still words, no extra picture.
- [ ] Pick a PDF or other non-picture. Nothing is inserted.

## Many, size, sit
- [ ] Put two pictures in one note. Each keeps its own size.
- [ ] Tap one. Thin mint ring, corner squares, a sit switch. No bin.
- [ ] Drag a corner. It grows or shrinks. No pinch needed.
- [ ] Switch to on top. Words can sit behind it. Drag the picture around.
- [ ] Switch back to in line. It returns to its row. Switch to on top again: last spot comes back.

## Delete and save
- [ ] Tap a picture, press Backspace. It is gone.
- [ ] Put another in. Click in the words just below it, press Backspace once: the picture is picked, still there. Press Backspace again: it is gone.
- [ ] Undo (Ctrl+Z) brings it back. Redo takes it out again.
- [ ] Reload the note. Pictures are still there, same sit and size.
- [ ] Open the files page. The card still shows words only, no picture.

## Broken and huge
- [ ] A huge camera photo still fits the pad (long side shrunk).
- [ ] An empty frame (broken picture) can be Backspaced away. The rest of the note stays.
```

- [ ] **Step 2: Run the full suite**

Run: `npx vitest run`
Expected: PASS (count should be previous + the new tests; do not drop old ones).

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Browser walk**

Use the preview tooling, not a raw `npm run dev`. Do the checklist on computer width and a phone width (`390`). Confirm Home, Study timer, and files page still work after visiting Notes (timer engine stays mounted).

- [ ] **Step 4: Commit the walk file**

```
git.exe add docs/superpowers/verification/2026-09-16-notes-pad-pictures.md
git.exe commit -m @"
Write the notepad pictures check.

A short walk of paste, pick, resize, sit on top, Backspace, and
the files card staying words only.
"@
```

---

## Self-review vs spec

| Spec decision | Plan task |
|---|---|
| Paste from clipboard | Task 7 `onPaste` image before text |
| Picture button → file picker | Task 6 |
| Show in pad | Task 7 |
| Many pictures, each own sit/size | Task 5 + 7 |
| Default own row in line | `defaultPicture` sit `inline` width `1` |
| Tap then switch → in front | switch on the picture, Task 7 |
| Drag to move when in front | `placePictureAt` |
| Corner resize, no pinch | `sizePictureAt`, no gesture handler |
| Tap + Backspace, and Backspace when caret is on it | `backspaceAtStart` on picture; first Backspace below only picks |
| No bin | Task 7 forbids a delete control on the picture |
| Sync with the note (choice A / store in body) | Task 1 pic line in `body` |
| Cards words only | Task 2 |
| Shrink huge photos, 800, webp | Task 4 pin + Task 6 `shrinkNotePicture` |
| Not a picture, not inserted | Task 4 mime + Task 6/7 ignore non-images |
| Broken → empty frame | Task 1 `emptyPicture` |
| Undo/redo | existing history via `rememberCurrent` + `commit` |
| Phone sheet and computer window | same `NotesEditor` / `NotesStrip` |
| Out of scope: card pictures, pinch, camera, extra store | never in file map |

Spec status flips to Approved in Task 1. No new route. No schema change.
