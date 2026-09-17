# Notes Pad Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Jeff turn a web address in the notepad into a link: Enter on a URL-only line stamps it, a press shows a cream card on a computer or a small peek on a phone, and a press on the card opens the site in a new tab.

**Architecture:** A link is a third style mark on the letters (`link`, beside bold and underline), stored in the same run flags in the note body. Detecting a URL line, stamping/dropping the mark, building the address-only card, and reading page HTML are pure functions in `src/lib/` so Vitest can pin them. The editor draws the mark and reports a press. A small server action looks the page up (the browser cannot). The pop-up is not saved in the note; a device-local cache remembers the last lookup.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript strict, Tailwind v4, Zustand persist, Dexie, Supabase `notes.body` text, Vitest, lucide-react. No new dependencies. Follow existing `'use server'` in `src/app/actions/auth.ts`. Next.js 16 docs may live under `node_modules/next/dist/docs/` — read them before adding the action if that folder exists.

**Spec:** [docs/superpowers/specs/2026-09-17-notes-pad-links-design.md](../specs/2026-09-17-notes-pad-links-design.md)

## Global Constraints

- **Never hardcode a colour.** Components reference `--mt-*` only. Raw `--mac-*` hues stay inside `globals.css`. Notes already has mint `--mt-accent`; the link underline and icon chip use that. Do not invent a second link colour.
- **Do not write comments.** Names and structure carry the meaning.
- **No defensive programming.** No guards for states the types exclude.
- **No `instanceof`, no `typeof` branching** to discriminate shapes. `Block` stays a discriminated union; switch on `kind`. URL vs words is `isUrlLine` on the visible text, never a string sniff of run marks at the call site.
- **Handle exceptions only where there is something to do about them.** The lookup action catches network and parse failure and returns `null`. Pure functions do not catch.
- Server Components by default; `'use client'` only on the leaf that needs it. The editor, card, and pad already are client leaves. The lookup is a server action.
- Touch targets at least 44px (`min-h-11 min-w-11`) for the card press target. The linked words in the line may stay inline (they are text).
- **Commits are Jeff's alone.** Never add a `Co-Authored-By` trailer or any generated-with attribution.
- Next.js 16 differs from training data. This feature adds **no new route**. Do not rewrite App Router files besides a new server-action module.
- **Do not** add a library (no TipTap, no HTML parser package, no linkify).
- **Do not** change the notes table, Dexie schema, `noteLocal.ts` write shape, `noteRepo.ts` mapping, or `noteSync.ts` merge. Body stays one string. Link marks ride inside existing style runs.
- Pause after typing before save stays `NOTE_SAVE_PAUSE_MS = 400`.
- Vitest is pure functions only. No DOM, no component render. Editor wiring is source-pinned in `notePadUi.test.ts`.
- Branch: cut `feat/notes-pad-links` from current `main` before the first commit of Task 1.
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
| `src/lib/noteLink.ts` | `isUrlLine`, `isBlockedHost`, `fallbackPreview` |
| `src/lib/noteLink.test.ts` | URL line yes/no, blocked hosts, address-only card copy |
| `src/lib/noteStyle.ts` | `link` on `NoteStyle` / `NoteSpan` / runs; `NoteMark` includes `'link'` |
| `src/lib/noteStyle.test.ts` | link mark compact / apply / inherit |
| `src/lib/noteDoc.ts` | `NOTE_RUN_LINK`, encode/decode the third flag |
| `src/lib/noteDoc.test.ts` | round-trip link runs; old notes without the flag still decode |
| `src/lib/noteEdit.ts` | `reconcileWordLinks`, Enter stamps a URL line without splitting |
| `src/lib/noteEdit.test.ts` | Enter on URL line; extra words drop the mark; URL edit keeps it |
| `src/lib/noteLinkPreview.ts` | parse HTML for icon, name, site, short text |
| `src/lib/noteLinkPreview.test.ts` | og/title fallbacks, empty HTML |
| `src/app/actions/linkPreview.ts` | server fetch; returns parsed preview or `null` |
| `src/store/useLinkPreviewStore.ts` | device cache keyed by href |
| `src/components/notes/NotesLinkCard.tsx` | cream card (md+) / small peek (phone); press opens the href |
| `src/components/notes/NotesEditor.tsx` | draw link runs, read them back from the DOM, click reports the href |
| `src/components/notes/NotesPad.tsx` | own pop-up state, tap-away, call the lookup |
| `src/lib/notePadUi.test.ts` | pin editor / pad / card wiring |
| `docs/superpowers/specs/2026-09-17-notes-pad-links-design.md` | status → Approved in Task 1 |
| `docs/superpowers/verification/2026-09-17-notes-pad-links.md` | human walk from spec §6 |

Encode format (lock this; do not invent another):

- Run flags stay in this order: optional `NOTE_RUN_BOLD` (`\u0011`), optional `NOTE_RUN_UNDERLINE` (`\u0013`), optional `NOTE_RUN_LINK` (`\u0012`), then `NOTE_RUN_SEP`.
- A run with only a link is `NOTE_RUN_START + NOTE_RUN_LINK + NOTE_RUN_SEP + text`.
- Old notes with only bold/underline flags still decode. Missing `link` means `false`.
- Item line, picture line, and body join rules are unchanged.

URL line (lock this):

```ts
export function isUrlLine(text: string): boolean
```

Trim ends, then the whole remainder must be `http://` or `https://` plus a host and optional path/query/hash. No spaces. No `javascript:`. No `www.example.com` without a scheme. No `http://localhost` / private hosts for **lookup** (`isBlockedHost`); those also fail `isUrlLine` so they never become a link.

Enter on a URL line (lock this):

- Do **not** split the line at the caret.
- Stamp `link: true` on every character of that line.
- Insert a new empty paragraph after a paragraph, or a new empty unchecked item at the same indent after an item.
- Caret lands on the new empty line at offset 0.

Reconcile after typing (lock this):

- If the line is no longer a URL line, drop every `link` mark on it.
- If it is still a URL line **and** it already had any `link` mark, stamp the whole (possibly edited) line as a link.
- If it is a URL line but never had a link mark, leave it plain (only Enter stamps).

Pop-up (lock this):

- Computer (`useIsMdUp()` true): cream card — mint icon chip, name, site, short text.
- Phone: small peek — icon, name, site. No bio.
- Press the card: `window.open(href, '_blank', 'noopener,noreferrer')`.
- Press the address: show the card, do not open the site.
- Pointer down outside the card closes it (including on the address).
- One card at a time.

Lookup (lock this):

- Send only the href.
- While waiting, show `fallbackPreview(href)`.
- On success, fill the card and remember it on this device.
- On failure or blocked host, stay on the fallback. The card still opens the site.

---

### Task 1: Detect a URL line

**Files:**
- Create: `src/lib/noteLink.ts`
- Create: `src/lib/noteLink.test.ts`
- Modify: `docs/superpowers/specs/2026-09-17-notes-pad-links-design.md` (status line only: `Awaiting review` → `Approved`)

**Interfaces:**
- Consumes: nothing from later tasks
- Produces:
  - `export type LinkPreview = { href: string; name: string; site: string; text: string; icon: string | null }`
  - `export function isUrlLine(text: string): boolean`
  - `export function isBlockedHost(host: string): boolean`
  - `export function fallbackPreview(href: string): LinkPreview`

- [ ] **Step 1: Cut the branch and mark the spec approved**

```
git.exe checkout main
git.exe checkout -b feat/notes-pad-links
```

In the spec, change `**Status:** Awaiting review` to `**Status:** Approved`.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/noteLink.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fallbackPreview, isBlockedHost, isUrlLine } from './noteLink';

describe('isUrlLine', () => {
  it('accepts http and https with a host, and ignores end spaces', () => {
    expect(isUrlLine('https://github.com/JeffTiong1031')).toBe(true);
    expect(isUrlLine('http://example.com')).toBe(true);
    expect(isUrlLine('  https://github.com/JeffTiong1031  ')).toBe(true);
  });

  it('rejects extra words, missing scheme, and javascript', () => {
    expect(
      isUrlLine('see https://github.com/JeffTiong1031 later'),
    ).toBe(false);
    expect(isUrlLine('www.github.com/JeffTiong1031')).toBe(false);
    expect(isUrlLine('javascript:alert(1)')).toBe(false);
    expect(isUrlLine('https://localhost/secret')).toBe(false);
  });
});

describe('isBlockedHost', () => {
  it('blocks loopback, private, and link-local names', () => {
    expect(isBlockedHost('localhost')).toBe(true);
    expect(isBlockedHost('127.0.0.1')).toBe(true);
    expect(isBlockedHost('10.0.0.1')).toBe(true);
    expect(isBlockedHost('192.168.0.1')).toBe(true);
    expect(isBlockedHost('169.254.169.254')).toBe(true);
    expect(isBlockedHost('github.com')).toBe(false);
  });
});

describe('fallbackPreview', () => {
  it('builds name and site from the address', () => {
    expect(fallbackPreview('https://github.com/JeffTiong1031')).toEqual({
      href: 'https://github.com/JeffTiong1031',
      name: 'JeffTiong1031',
      site: 'github.com',
      text: '',
      icon: null,
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test src/lib/noteLink.test.ts`

Expected: FAIL — cannot find module `./noteLink`.

- [ ] **Step 4: Write the minimal implementation**

Create `src/lib/noteLink.ts`. `isUrlLine` trims, then matches `^https?:\/\/` plus a host. Parse with `new URL(trimmed)` inside a try; if it throws, return false. Scheme must be `http:` or `https:`. Path may be empty. `isBlockedHost` is true for `localhost`, `127.0.0.1`, `[::1]`, `0.0.0.0`, any IPv4 in `10.*`, `192.168.*`, `172.16–31.*`, `169.254.*`, or a host ending `.local`. `isUrlLine` is false when the host is blocked.

`fallbackPreview(href)`: `URL` parse (already valid). `site` is `url.hostname` with a leading `www.` stripped. `name` is the last non-empty path segment, or `site` if the path is `/`. `text` is `''`. `icon` is `null`. `href` is the trimmed input.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test src/lib/noteLink.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```
git.exe add src/lib/noteLink.ts src/lib/noteLink.test.ts docs/superpowers/specs/2026-09-17-notes-pad-links-design.md
git.exe commit -m @"
Pin which notepad lines count as a web address.

"@
```

---

### Task 2: Store a link mark with bold and underline

**Files:**
- Modify: `src/lib/noteStyle.ts`
- Modify: `src/lib/noteStyle.test.ts`
- Modify: `src/lib/noteDoc.ts`
- Modify: `src/lib/noteDoc.test.ts`
- Modify: `src/components/notes/NotesEditor.tsx` (`inheritedStyleFor` picture branch must include `link: false` so `tsc` passes)

**Interfaces:**
- Consumes: nothing from Task 1
- Produces:
  - `NoteMark = 'bold' | 'underline' | 'link'`
  - `NoteStyle = { bold: boolean; underline: boolean; link: boolean }`
  - `NoteSpan` gains `link: boolean`
  - `PLAIN_STYLE.link === false`
  - `noteRuns` / `spansFromLeaves` leaves gain `link: boolean`
  - `NOTE_RUN_LINK = '\u0012'`
  - encode/decode write and read the flag after underline

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/noteStyle.test.ts`:

```ts
it('stamps and clears a link mark without dropping bold', () => {
  const bold = applyMark('https://x.com', undefined, 0, 13, 'bold', true);
  const linked = applyMark(bold.text, bold.spans, 0, 13, 'link', true);
  expect(linked.spans).toEqual([
    { start: 0, end: 13, bold: true, underline: false, link: true },
  ]);
  expect(
    applyMark(linked.text, linked.spans, 0, 13, 'link', false).spans,
  ).toEqual([{ start: 0, end: 13, bold: true, underline: false, link: false }]);
});
```

Add to `src/lib/noteDoc.test.ts`:

```ts
it('round-trips a link run and still reads old bold-only notes', () => {
  const block = {
    kind: 'paragraph' as const,
    text: 'https://github.com/JeffTiong1031',
    spans: [
      {
        start: 0,
        end: 'https://github.com/JeffTiong1031'.length,
        bold: false,
        underline: false,
        link: true,
      },
    ],
  };
  expect(decodeBody(encodeBody([block]))).toEqual([block]);
  expect(
    decodeLine(`${NOTE_RUN_START}${NOTE_RUN_BOLD}${NOTE_RUN_SEP}Eggs`),
  ).toEqual({
    kind: 'paragraph',
    text: 'Eggs',
    spans: [
      { start: 0, end: 4, bold: true, underline: false, link: false },
    ],
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test src/lib/noteStyle.test.ts src/lib/noteDoc.test.ts`

Expected: FAIL — `link` is not on the types / encode ignores it.

- [ ] **Step 3: Write the minimal implementation**

Add `link: boolean` to `NoteStyle`, `NoteSpan`, `PLAIN_STYLE`, `styleAt`, `stylesFor` assignment, `compactSpans` equality (include `link`), `noteRuns` grouping and return, `spansFromLeaves`, `insertVisible` copy, `applyMark` / `rangeHasMark` `'link'` case.

In `noteDoc.ts`:

```ts
export const NOTE_RUN_LINK = '\u0012';
```

`stripMarks` also strips `NOTE_RUN_LINK`. `decodeVisible` after underline:

```ts
let link = false;
if (raw[cursor] === NOTE_RUN_LINK) {
  link = true;
  cursor += 1;
}
```

`encodeVisible` grouping must compare `link`. Flags:

```ts
const flags =
  (current.bold ? NOTE_RUN_BOLD : '') +
  (current.underline ? NOTE_RUN_UNDERLINE : '') +
  (current.link ? NOTE_RUN_LINK : '');
```

Update every existing `{ bold, underline }` literal the compiler names to include `link: false` (editor `inheritedStyleFor` picture branch, style tests, `leavesFrom` later in Task 6). In this task, fix `inheritedStyleFor` so `tsc` is green.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test src/lib/noteStyle.test.ts src/lib/noteDoc.test.ts`

Then: `npx tsc --noEmit`

Expected: tests PASS. `tsc` clean after `link` is on every `NoteStyle`.

- [ ] **Step 5: Commit**

```
git.exe add src/lib/noteStyle.ts src/lib/noteStyle.test.ts src/lib/noteDoc.ts src/lib/noteDoc.test.ts src/components/notes/NotesEditor.tsx
git.exe commit -m @"
Keep a link mark beside bold and underline in the note body.

"@
```

---

### Task 3: Enter stamps a URL line; typing can drop it

**Files:**
- Modify: `src/lib/noteEdit.ts`
- Modify: `src/lib/noteEdit.test.ts`

**Interfaces:**
- Consumes: `isUrlLine` from Task 1; `applyMark` `'link'` from Task 2; `withVisible`
- Produces:
  - `export function lineHasLink(spans: NoteSpan[] | undefined): boolean`
  - `export function reconcileWordLinks(block: WordBlock): WordBlock`
  - `enterAt` URL-line behaviour locked above
  - `insertText` and `deleteSelection` run `reconcileWordLinks` on every word block they return

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/noteEdit.test.ts`:

```ts
import { isUrlLine } from './noteLink';

const HREF = 'https://github.com/JeffTiong1031';

describe('enterAt url line', () => {
  it('stamps the whole line and starts a new empty line, even from the middle', () => {
    const blocks: Block[] = [{ kind: 'paragraph', text: HREF }];
    const next = enterAt(blocks, { index: 0, offset: 8 });
    expect(next.blocks[0]).toMatchObject({
      kind: 'paragraph',
      text: HREF,
    });
    expect(next.blocks[0].spans).toEqual([
      {
        start: 0,
        end: HREF.length,
        bold: false,
        underline: false,
        link: true,
      },
    ]);
    expect(next.blocks[1]).toEqual({ kind: 'paragraph', text: '' });
    expect(next.caret).toEqual({ index: 1, offset: 0 });
  });

  it('stamps a tick-list URL and adds an empty item under it', () => {
    const blocks: Block[] = [
      { kind: 'item', text: HREF, checked: false, indent: 1 },
    ];
    const next = enterAt(blocks, { index: 0, offset: HREF.length });
    expect(next.blocks[0]).toMatchObject({ text: HREF, indent: 1 });
    expect(next.blocks[1]).toEqual({
      kind: 'item',
      text: '',
      checked: false,
      indent: 1,
    });
  });

  it('still splits a line that is not only a URL', () => {
    const blocks: Block[] = [{ kind: 'paragraph', text: 'Hello' }];
    const next = enterAt(blocks, { index: 0, offset: 2 });
    expect(next.blocks.map((block) => block.kind === 'paragraph' && block.text)).toEqual(
      ['He', 'llo'],
    );
  });
});

describe('reconcileWordLinks', () => {
  it('drops the mark when extra words appear, and keeps it when the address changes', () => {
    const linked: Block[] = [
      {
        kind: 'paragraph',
        text: HREF,
        spans: [
          {
            start: 0,
            end: HREF.length,
            bold: false,
            underline: false,
            link: true,
          },
        ],
      },
    ];
    const longer = insertText(linked, { index: 0, offset: HREF.length }, '/x');
    expect(isUrlLine(longer.blocks[0].kind === 'paragraph' ? longer.blocks[0].text : '')).toBe(
      true,
    );
    expect(longer.blocks[0]).toMatchObject({
      text: `${HREF}/x`,
    });
    expect(
      longer.blocks[0].kind === 'paragraph' &&
        longer.blocks[0].spans?.every((span) => span.link),
    ).toBe(true);

    const broken = insertText(linked, { index: 0, offset: HREF.length }, ' later');
    expect(broken.blocks[0]).toEqual({
      kind: 'paragraph',
      text: `${HREF} later`,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test src/lib/noteEdit.test.ts`

Expected: FAIL — Enter still splits the URL; extra words keep the mark.

- [ ] **Step 3: Write the minimal implementation**

In `noteEdit.ts`:

```ts
export function lineHasLink(spans: NoteSpan[] | undefined): boolean {
  return (spans ?? []).some((span) => span.link);
}

export function reconcileWordLinks(block: WordBlock): WordBlock {
  const had = lineHasLink(block.spans);
  if (!isUrlLine(block.text)) {
    if (!had) return block;
    const cleared = applyMark(
      block.text,
      block.spans,
      0,
      block.text.length,
      'link',
      false,
    );
    return withVisible(block, cleared.text, cleared.spans);
  }
  if (!had) return block;
  const stamped = applyMark(
    block.text,
    block.spans,
    0,
    block.text.length,
    'link',
    true,
  );
  return withVisible(block, stamped.text, stamped.spans);
}
```

At the start of `enterAt` paragraph and item branches (after empty-item handling on items), if `isUrlLine(block.text)`: stamp link on the whole line, splice in the new empty line, return. Do not split.

At the end of `insertText` word branch and `deleteSelection` word branch (single-block and join), run `reconcileWordLinks` on the word block(s) you write back.

Empty item Enter (outdent / exit checklist) is unchanged — those lines are not URL lines.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test src/lib/noteEdit.test.ts`

Expected: PASS. Existing Enter / Backspace tests still pass.

- [ ] **Step 5: Commit**

```
git.exe add src/lib/noteEdit.ts src/lib/noteEdit.test.ts
git.exe commit -m @"
Stamp a notepad URL on Enter and drop it when extra words appear.

"@
```

---

### Task 4: Read a page’s name from HTML

**Files:**
- Create: `src/lib/noteLinkPreview.ts`
- Create: `src/lib/noteLinkPreview.test.ts`

**Interfaces:**
- Consumes: `LinkPreview`, `fallbackPreview` from Task 1
- Produces:
  - `export function previewFromHtml(html: string, href: string): LinkPreview`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/noteLinkPreview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { previewFromHtml } from './noteLinkPreview';

const HREF = 'https://github.com/JeffTiong1031';

describe('previewFromHtml', () => {
  it('prefers og title, site name, description, and image', () => {
    const html = `
      <meta property="og:title" content="JeffTiong1031 (Tiong)">
      <meta property="og:description" content="CS (AI) undergrad">
      <meta property="og:image" content="https://github.com/icon.png">
    `;
    expect(previewFromHtml(html, HREF)).toEqual({
      href: HREF,
      name: 'JeffTiong1031 (Tiong)',
      site: 'github.com',
      text: 'CS (AI) undergrad',
      icon: 'https://github.com/icon.png',
    });
  });

  it('falls back to title and the address card when og is missing', () => {
    const html = '<title>JeffTiong1031</title>';
    const preview = previewFromHtml(html, HREF);
    expect(preview.name).toBe('JeffTiong1031');
    expect(preview.site).toBe('github.com');
    expect(preview.text).toBe('');
    expect(preview.icon).toBe(null);
  });

  it('keeps the address card when the HTML has nothing', () => {
    expect(previewFromHtml('', HREF)).toEqual(
      expect.objectContaining({
        name: 'JeffTiong1031',
        site: 'github.com',
        text: '',
        icon: null,
      }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/noteLinkPreview.test.ts`

Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/noteLinkPreview.ts`. Start from `fallbackPreview(href)`. Scan the HTML with small case-insensitive regexes (no extra package):

- `property="og:title"` / `name="twitter:title"` / `<title>…</title>` → `name`
- `property="og:description"` / `name="description"` → `text` (trim, collapse whitespace, cap at 180 characters)
- `property="og:image"` or `rel="icon"` `href` → `icon`, resolved with `new URL(icon, href).href` when relative

If a field is missing, keep the fallback value. Do not throw.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/lib/noteLinkPreview.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
git.exe add src/lib/noteLinkPreview.ts src/lib/noteLinkPreview.test.ts
git.exe commit -m @"
Read a page title for the notepad link card from HTML.

"@
```

---

### Task 5: Look the page up on the server and remember it here

**Files:**
- Create: `src/app/actions/linkPreview.ts`
- Create: `src/store/useLinkPreviewStore.ts`
- Modify: `src/lib/noteLink.test.ts` (pin the action file reads the guards)

**Interfaces:**
- Consumes: `isUrlLine`, `isBlockedHost`, `fallbackPreview`, `previewFromHtml`
- Produces:
  - `export async function fetchLinkPreview(href: string): Promise<LinkPreview | null>`
  - `useLinkPreviewStore`: `{ byHref: Record<string, LinkPreview>; remember(preview: LinkPreview): void; lookup(href: string): LinkPreview | undefined }` persisted to localStorage under `mt-link-preview`

- [ ] **Step 1: Write the failing wiring test**

Add to `src/lib/noteLink.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ACTION = readFileSync(
  path.resolve(process.cwd(), 'src/app/actions/linkPreview.ts'),
  'utf8',
);
const STORE = readFileSync(
  path.resolve(process.cwd(), 'src/store/useLinkPreviewStore.ts'),
  'utf8',
);

describe('lookup wiring', () => {
  it('asks the server, blocks private hosts, and remembers on this device', () => {
    expect(ACTION).toContain("'use server'");
    expect(ACTION).toContain('isUrlLine(');
    expect(ACTION).toContain('isBlockedHost(');
    expect(ACTION).toContain('previewFromHtml(');
    expect(STORE).toContain('mt-link-preview');
    expect(STORE).toContain('remember');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/noteLink.test.ts`

Expected: FAIL — `linkPreview.ts` / store missing.

- [ ] **Step 3: Write the action and store**

`src/app/actions/linkPreview.ts` starts with `'use server'`. If `!isUrlLine(href)` return `null`. Parse `new URL(href.trim())`. If `isBlockedHost(url.hostname)` return `null`. `fetch` with redirect follow, `headers: { Accept: 'text/html' }`, abort after 4000ms (`AbortSignal.timeout(4000)`). If `!response.ok` or content-type is not HTML-ish, return `null`. Read at most 512_000 characters. Return `previewFromHtml(html, url.href)`. Catch abort/network and return `null`.

`useLinkPreviewStore` is Zustand `persist` like other stores. `lookup` reads `byHref[href]`. `remember` writes that key.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/lib/noteLink.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
git.exe add src/app/actions/linkPreview.ts src/store/useLinkPreviewStore.ts src/lib/noteLink.test.ts
git.exe commit -m @"
Look up a notepad link on the server and remember it on this device.

"@
```

---

### Task 6: Draw the link, show the card, open the site

**Files:**
- Create: `src/components/notes/NotesLinkCard.tsx`
- Modify: `src/components/notes/NotesEditor.tsx`
- Modify: `src/components/notes/NotesPad.tsx`
- Modify: `src/lib/notePadUi.test.ts`

**Interfaces:**
- Consumes: `LinkPreview`, `fallbackPreview`, `fetchLinkPreview`, `useLinkPreviewStore`, `reconcileWordLinks`, `useIsMdUp`
- Produces: editor `onLinkPress?: (href: string) => void`; pad owns open preview; card calls `window.open`

- [ ] **Step 1: Write the failing wiring tests**

Add to `src/lib/notePadUi.test.ts`:

```ts
const CARD = readFileSync(
  path.resolve(process.cwd(), 'src/components/notes/NotesLinkCard.tsx'),
  'utf8',
);

describe('notes pad links', () => {
  it('draws a link run and reads it back from the line', () => {
    expect(EDITOR).toContain('data-note-link');
    expect(EDITOR).toContain('closest(\'[data-note-link]\')');
    expect(EDITOR).toContain('reconcileWordLinks(');
    expect(EDITOR).toContain('onLinkPress');
    expect(EDITOR).not.toContain('<a ');
  });

  it('shows cream on a computer and a peek on a phone, and opens from the card', () => {
    expect(PAD).toContain('NotesLinkCard');
    expect(PAD).toContain('fetchLinkPreview(');
    expect(PAD).toContain('fallbackPreview(');
    expect(CARD).toContain('useIsMdUp');
    expect(CARD).toContain('window.open');
    expect(CARD).toContain("'_blank'");
    expect(CARD).toContain('noopener,noreferrer');
    expect(CARD).toContain('--mt-accent');
    expect(CARD).toContain('--mt-glass');
    expect(CARD).not.toContain('Replace URL');
  });
});
```

Add `CARD` next to the other `readFileSync` constants at the top of that file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/notePadUi.test.ts`

Expected: FAIL — card file missing / strings missing.

- [ ] **Step 3: Editor — draw, read back, report a press**

`leavesFrom` leaves gain `link: Boolean(parent?.closest('[data-note-link]'))`.

`noteRunNodes`: if `run.link`, wrap in

```tsx
<span
  key={index}
  data-note-link=""
  className="underline decoration-[var(--mt-accent)] underline-offset-2 text-[var(--mt-text)]"
>
```

Bold/underline still wrap as they do today **inside or around** that span so all three marks can combine. Simplest: innermost text, then `<u>` if underline, then `<strong>` if bold, then the link span if `run.link`.

A run with no marks still returns plain text.

`applyText`: after `withVisible`, assign `reconcileWordLinks` of that word block.

Add optional `onLinkPress?: (href: string) => void` to `NotesEditorProps`. On click inside a `[data-note-link]` span: `preventDefault`, read the **line’s** `block.text.trim()` (the whole line is the href), call `onLinkPress`. Do not `window.open` from the editor.

Do not render `<a href>`.

- [ ] **Step 4: Card and pad**

`NotesLinkCard.tsx` is `'use client'`. Props: `{ preview: LinkPreview; onOpen: () => void }`. `useIsMdUp()`: true → cream card (`bg-[var(--mt-glass)] border border-[var(--mt-border)] rounded-2xl`, mint `32px` rounded chip, name, site, then `preview.text` if non-empty). False → pill peek (icon, name, site only; do not render `preview.text`). Root is a `<button type="button" className="min-h-11 ...">` that calls `onOpen`. `onOpen` in the pad is:

```ts
window.open(preview.href, '_blank', 'noopener,noreferrer');
```

Pad state: `preview: LinkPreview | null`. `onLinkPress(href)`: set preview to `useLinkPreviewStore.getState().lookup(href) ?? fallbackPreview(href)`; then `void fetchLinkPreview(href).then(...)` — if still the same href, `remember` and set preview. Pointer down on `document` while preview is set: if the event target is not inside `[data-note-card]`, set preview to `null`. Put `data-note-card` on the card root. Do not treat the opening click as outside (register the listener on the next tick, or ignore the first pointerdown).

One card. A new `onLinkPress` replaces the current preview.

The card sits near the pad’s writing column (absolute, under the first linked line is enough; `mt-2` below the editor is acceptable if measuring the span is messy). Do not add a veil.

- [ ] **Step 5: Run tests**

Run: `npm test src/lib/notePadUi.test.ts src/lib/noteEdit.test.ts src/lib/noteLink.test.ts`

Then: `npx tsc --noEmit`

Expected: PASS / clean.

- [ ] **Step 6: Commit**

```
git.exe add src/components/notes/NotesLinkCard.tsx src/components/notes/NotesEditor.tsx src/components/notes/NotesPad.tsx src/lib/notePadUi.test.ts
git.exe commit -m @"
Show a notepad link card on press and open the site from the card.

"@
```

---

### Task 7: Verification list

**Files:**
- Create: `docs/superpowers/verification/2026-09-17-notes-pad-links.md`

**Interfaces:**
- Consumes: spec §6
- Produces: the human walk

- [ ] **Step 1: Write the checklist**

```md
# Notes pad links — check

Date: 2026-09-17

| Step | Computer | Phone |
|---|---|---|
| Paste `https://github.com/JeffTiong1031`, Enter, land on a new empty line, line is a mint-underlined link | | |
| Extra words on a line, Enter does not make a link | | |
| Press the address: cream card (computer) / small peek (phone). No “replace with title” bar | | |
| Tap away: card closes. Address does not open the browser | | |
| Press the card: site opens in a new tab, notepad stays | | |
| Offline or a page that will not talk: card still shows site name from the address, card still opens the site | | |
| Add a word after a linked address: underline goes, no card | | |
| Tick-list line that is only a URL: Enter stamps and adds an empty item | | |
| Files page card still shows ordinary words, including the address | | |
```

- [ ] **Step 2: Commit**

```
git.exe add docs/superpowers/verification/2026-09-17-notes-pad-links.md
git.exe commit -m @"
Write the notepad links check.

"@
```

---

## Self-review

**Spec coverage**

| Spec | Task |
|---|---|
| Paste or type, Enter, new line | 3, 6 |
| Line must be only the address; end spaces ok | 1, 3 |
| Only http/https; no javascript; no www without scheme | 1 |
| Address stays the words; card is a pop-up, not stored | 2, 5, 6 |
| Computer cream card; phone small peek; no replace-title bar | 6 |
| Press card opens; address only shows card; tap away closes | 6 |
| Try real page; fallback from address; cache on this device | 1, 4, 5, 6 |
| Edit: extra words drop; URL edit keeps; Backspace ordinary | 3 |
| Tick-list same rule; pictures unchanged | 3 |
| Files page words only | (no code — address is already text; Task 7 checks) |
| New tab, notepad stays | 6 |
| Tests listed in spec §6 | 1–4, 7 |

**Placeholders:** none.

**Types:** `LinkPreview`, `isUrlLine`, `fallbackPreview`, `previewFromHtml`, `fetchLinkPreview`, `reconcileWordLinks`, `NOTE_RUN_LINK` are used with the same names in later tasks.
