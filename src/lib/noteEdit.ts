import { joinIntoLine, stripIncoming } from './noteCopy';
import {
  decodeBody,
  encodeBody,
  withVisible,
  type Block,
  type WordBlock,
} from './noteDoc';
import { isUrlLine, urlRanges } from './noteLink';
import {
  defaultPicture,
  placePicture,
  sizePicture,
  switchPictureSit,
} from './notePicture';
import {
  applyMark,
  compactSpans,
  concatVisible,
  deleteVisible,
  insertVisible,
  rangeHasMark,
  sliceVisible,
  stylesFor,
  type NoteMark,
  type NoteSpan,
  type NoteStyle,
} from './noteStyle';
export type { NoteMark, NoteStyle };

export interface DocCaret {
  index: number;
  offset: number;
}

export interface EditResult {
  blocks: Block[];
  caret: DocCaret;
}

export function blockLength(block: Block): number {
  switch (block.kind) {
    case 'picture':
      return 0;
    case 'paragraph':
    case 'item':
      return block.text.length;
  }
}

export function ordered(a: DocCaret, b: DocCaret): [DocCaret, DocCaret] {
  if (a.index < b.index || (a.index === b.index && a.offset <= b.offset)) {
    return [a, b];
  }
  return [b, a];
}

export function lineHasLink(spans: NoteSpan[] | undefined): boolean {
  return (spans ?? []).some((span) => span.link);
}

export function reconcileWordLinks(block: WordBlock): WordBlock {
  return applyUrlLinkMarks(block, false);
}

export function stampWordLinks(block: WordBlock): WordBlock {
  return applyUrlLinkMarks(block, true);
}

function applyUrlLinkMarks(block: WordBlock, stamp: boolean): WordBlock {
  const ranges = urlRanges(block.text);
  const had = lineHasLink(block.spans);
  if (!had && !stamp) {
    return block;
  }
  if (ranges.length === 0 && !had) {
    return block;
  }
  const styles = stylesFor(block.text, block.spans);
  const inUrl: boolean[] = [];
  for (let index = 0; index < styles.length; index += 1) {
    inUrl.push(false);
  }
  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) {
      inUrl[index] = true;
    }
  }
  for (let index = 0; index < styles.length; index += 1) {
    const linked = stamp ? inUrl[index] : inUrl[index] && styles[index].link;
    styles[index] = { ...styles[index], link: linked };
  }
  return withVisible(block, block.text, compactSpans(styles));
}

export function linksAfterEdit(previous: WordBlock, next: WordBlock): WordBlock {
  const spaces = (text: string) => (text.match(/[ \u00a0]/g) ?? []).length;
  if (spaces(next.text) > spaces(previous.text)) {
    return stampWordLinks(next);
  }
  return reconcileWordLinks(next);
}

export function lineNeedsModelTyping(
  text: string,
  spans: NoteSpan[] | undefined,
): boolean {
  return lineHasLink(spans) || urlRanges(text).length > 0;
}

export function insertNeedsModelTyping(
  text: string,
  spans: NoteSpan[] | undefined,
  offset: number,
  inserted: string,
): boolean {
  if (lineNeedsModelTyping(text, spans)) {
    return true;
  }
  return (
    urlRanges(text.slice(0, offset) + inserted + text.slice(offset)).length > 0
  );
}

function reconcileProduced(block: Block): Block {
  switch (block.kind) {
    case 'picture':
      return block;
    case 'paragraph':
    case 'item':
      return reconcileWordLinks(block);
  }
}

export function deleteSelection(
  blocks: Block[],
  start: DocCaret,
  end: DocCaret,
): EditResult {
  const [from, to] = ordered(start, end);
  const first = blocks[from.index];
  const last = blocks[to.index];
  const next = [...blocks];

  if (from.index === to.index) {
    switch (first.kind) {
      case 'picture':
        next.splice(from.index, 1);
        if (next.length === 0) {
          return {
            blocks: [{ kind: 'paragraph', text: '' }],
            caret: { index: 0, offset: 0 },
          };
        }
        return {
          blocks: next,
          caret: {
            index: Math.min(from.index, next.length - 1),
            offset: 0,
          },
        };
      case 'paragraph':
      case 'item': {
        const visible = deleteVisible(
          first.text,
          first.spans,
          from.offset,
          to.offset,
        );
        next[from.index] = reconcileWordLinks(
          withVisible(first, visible.text, visible.spans),
        );
        return { blocks: next, caret: from };
      }
    }
  }

  const replacement: Block[] = [];
  switch (first.kind) {
    case 'picture':
      break;
    case 'paragraph':
    case 'item': {
      const visible = sliceVisible(first.text, first.spans, 0, from.offset);
      replacement.push(
        reconcileWordLinks(withVisible(first, visible.text, visible.spans)),
      );
      break;
    }
  }
  switch (last.kind) {
    case 'picture':
      break;
    case 'paragraph':
    case 'item': {
      const visible = sliceVisible(
        last.text,
        last.spans,
        to.offset,
        last.text.length,
      );
      if (visible.text !== '') {
        replacement.push(
          reconcileWordLinks(withVisible(last, visible.text, visible.spans)),
        );
      }
      break;
    }
  }
  if (replacement.length === 0 && blocks.length === to.index - from.index + 1) {
    replacement.push({ kind: 'paragraph', text: '' });
  }
  next.splice(from.index, to.index - from.index + 1, ...replacement);
  const caretIndex = Math.min(from.index, next.length - 1);
  return {
    blocks: next,
    caret: { index: caretIndex, offset: replacement.length === 0 ? 0 : from.offset },
  };
}

export function insertText(
  blocks: Block[],
  caret: DocCaret,
  text: string,
  style?: NoteStyle,
): EditResult {
  const block = blocks[caret.index];
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next.splice(caret.index + 1, 0, { kind: 'paragraph', text });
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: text.length },
      };
    }
    case 'paragraph':
    case 'item': {
      const next = [...blocks];
      const inserted = insertVisible(
        block.text,
        block.spans,
        caret.offset,
        text,
        style,
      );
      next[caret.index] = linksAfterEdit(
        block,
        withVisible(block, inserted.text, inserted.spans),
      );
      return {
        blocks: next,
        caret: { index: caret.index, offset: caret.offset + text.length },
      };
    }
  }
}

export function insertPicture(
  blocks: Block[],
  caret: DocCaret,
  src: string,
): EditResult {
  const block = blocks[caret.index];
  const picture = defaultPicture(src);
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next.splice(caret.index + 1, 0, picture);
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: 0 },
      };
    }
    case 'paragraph': {
      const head = sliceVisible(block.text, block.spans, 0, caret.offset);
      const tail = sliceVisible(
        block.text,
        block.spans,
        caret.offset,
        block.text.length,
      );
      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        reconcileWordLinks(withVisible(block, head.text, head.spans)),
        picture,
        reconcileWordLinks(withVisible(block, tail.text, tail.spans)),
      );
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: 0 },
      };
    }
    case 'item': {
      const head = sliceVisible(block.text, block.spans, 0, caret.offset);
      const tail = sliceVisible(
        block.text,
        block.spans,
        caret.offset,
        block.text.length,
      );
      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        reconcileWordLinks(withVisible(block, head.text, head.spans)),
        picture,
        reconcileWordLinks(
          withVisible(
            { ...block, checked: false },
            tail.text,
            tail.spans,
          ),
        ),
      );
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: 0 },
      };
    }
  }
}

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
): Block[] {
  const block = blocks[index];
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next[index] = sizePicture(block, width);
      return next;
    }
    case 'paragraph':
    case 'item':
      return blocks;
  }
}

export function placePictureAt(
  blocks: Block[],
  index: number,
  x: number,
  y: number,
): Block[] {
  const block = blocks[index];
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next[index] = placePicture(block, x, y);
      return next;
    }
    case 'paragraph':
    case 'item':
      return blocks;
  }
}

export function typeOverRange(
  blocks: Block[],
  start: DocCaret,
  end: DocCaret,
  text: string,
  style?: NoteStyle,
): EditResult {
  const deleted = deleteSelection(blocks, start, end);
  return insertText(deleted.blocks, deleted.caret, text, style);
}

export type CaretMove =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End';

export function extendCaret(
  blocks: Block[],
  caret: DocCaret,
  key: CaretMove,
): DocCaret {
  const block = blocks[caret.index];
  switch (key) {
    case 'ArrowLeft':
      if (caret.offset > 0) {
        return { index: caret.index, offset: caret.offset - 1 };
      }
      if (caret.index === 0) {
        return caret;
      }
      return {
        index: caret.index - 1,
        offset: blockLength(blocks[caret.index - 1]),
      };
    case 'ArrowRight':
      if (caret.offset < blockLength(block)) {
        return { index: caret.index, offset: caret.offset + 1 };
      }
      if (caret.index === blocks.length - 1) {
        return caret;
      }
      return { index: caret.index + 1, offset: 0 };
    case 'ArrowUp':
      if (caret.index === 0) {
        return { index: 0, offset: 0 };
      }
      return {
        index: caret.index - 1,
        offset: Math.min(caret.offset, blockLength(blocks[caret.index - 1])),
      };
    case 'ArrowDown':
      if (caret.index === blocks.length - 1) {
        return { index: caret.index, offset: blockLength(block) };
      }
      return {
        index: caret.index + 1,
        offset: Math.min(caret.offset, blockLength(blocks[caret.index + 1])),
      };
    case 'Home':
      return { index: caret.index, offset: 0 };
    case 'End':
      return { index: caret.index, offset: blockLength(block) };
  }
}

export function pasteExternal(
  blocks: Block[],
  start: DocCaret,
  end: DocCaret,
  raw: string,
): EditResult {
  const [from, to] = ordered(start, end);
  const deleted = from.index === to.index && from.offset === to.offset
    ? { blocks, caret: from }
    : deleteSelection(blocks, from, to);
  const block = deleted.blocks[deleted.caret.index];

  switch (block.kind) {
    case 'picture':
      return insertText(
        deleted.blocks,
        deleted.caret,
        joinIntoLine(raw),
      );
    case 'item':
      return insertText(deleted.blocks, deleted.caret, joinIntoLine(raw));
    case 'paragraph': {
      const incoming = decodeBody(stripIncoming(raw).replaceAll('\r\n', '\n'));
      if (incoming.length === 1) {
        return insertText(
          deleted.blocks,
          deleted.caret,
          incoming[0].kind === 'picture' ? '' : incoming[0].text,
        );
      }

      const prefix = sliceVisible(
        block.text,
        block.spans,
        0,
        deleted.caret.offset,
      );
      const suffix = sliceVisible(
        block.text,
        block.spans,
        deleted.caret.offset,
        block.text.length,
      );
      const paragraphs = incoming.map((line, index): Block => {
        switch (line.kind) {
          case 'picture':
            return { kind: 'paragraph', text: '' };
          case 'paragraph':
          case 'item': {
            let visible: { text: string; spans?: NoteSpan[] } = {
              text: line.text,
              spans: line.spans,
            };
            if (index === 0) {
              visible = concatVisible(prefix, visible);
            }
            if (index === incoming.length - 1) {
              visible = concatVisible(visible, suffix);
            }
            return reconcileWordLinks(
              withVisible(
                { kind: 'paragraph', text: '' },
                visible.text,
                visible.spans,
              ),
            );
          }
        }
      });
      const next = [...deleted.blocks];
      next.splice(deleted.caret.index, 1, ...paragraphs);
      return {
        blocks: next,
        caret: {
          index: deleted.caret.index + paragraphs.length - 1,
          offset: blockLength(incoming[incoming.length - 1]),
        },
      };
    }
  }
}

export function pasteInternal(
  blocks: Block[],
  start: DocCaret,
  end: DocCaret,
  fragment: Block[],
): EditResult {
  const [from, to] = ordered(start, end);
  const deleted = from.index === to.index && from.offset === to.offset
    ? { blocks, caret: from }
    : deleteSelection(blocks, from, to);
  const block = deleted.blocks[deleted.caret.index];
  const inserted = decodeBody(encodeBody(fragment));
  const prefix: Block[] = [];
  const suffix: Block[] = [];

  switch (block.kind) {
    case 'picture': {
      const next = [...deleted.blocks];
      next.splice(deleted.caret.index + 1, 0, ...inserted);
      return {
        blocks: next,
        caret: {
          index: deleted.caret.index + inserted.length,
          offset: blockLength(inserted[inserted.length - 1]),
        },
      };
    }
    case 'paragraph': {
      const prefixVisible = sliceVisible(
        block.text,
        block.spans,
        0,
        deleted.caret.offset,
      );
      const suffixVisible = sliceVisible(
        block.text,
        block.spans,
        deleted.caret.offset,
        block.text.length,
      );
      if (prefixVisible.text !== '') {
        prefix.push(
          withVisible(
            { kind: 'paragraph', text: '' },
            prefixVisible.text,
            prefixVisible.spans,
          ),
        );
      }
      if (suffixVisible.text !== '') {
        suffix.push(
          withVisible(
            { kind: 'paragraph', text: '' },
            suffixVisible.text,
            suffixVisible.spans,
          ),
        );
      }
      break;
    }
    case 'item': {
      const prefixVisible = sliceVisible(
        block.text,
        block.spans,
        0,
        deleted.caret.offset,
      );
      const suffixVisible = sliceVisible(
        block.text,
        block.spans,
        deleted.caret.offset,
        block.text.length,
      );
      if (prefixVisible.text !== '') {
        prefix.push(
          withVisible(block, prefixVisible.text, prefixVisible.spans),
        );
      }
      if (suffixVisible.text !== '') {
        suffix.push(
          withVisible(
            { ...block, checked: false },
            suffixVisible.text,
            suffixVisible.spans,
          ),
        );
      }
      break;
    }
  }

  const next = [...deleted.blocks];
  next.splice(
    deleted.caret.index,
    1,
    ...prefix.map(reconcileProduced),
    ...inserted.map(reconcileProduced),
    ...suffix.map(reconcileProduced),
  );
  const caretIndex = deleted.caret.index + prefix.length + inserted.length - 1;
  return {
    blocks: next,
    caret: {
      index: caretIndex,
      offset: blockLength(inserted[inserted.length - 1]),
    },
  };
}

export function familyEnd(blocks: Block[], index: number): number {
  const root = blocks[index];
  switch (root.kind) {
    case 'picture':
    case 'paragraph':
      return index;
    case 'item': {
      let end = index;
      for (let candidate = index + 1; candidate < blocks.length; candidate += 1) {
        const block = blocks[candidate];
        switch (block.kind) {
          case 'picture':
          case 'paragraph':
            return end;
          case 'item':
            if (block.indent <= root.indent) {
              return end;
            }
            end = candidate;
        }
      }
      return end;
    }
  }
}

export function canIndent(blocks: Block[], index: number): boolean {
  const block = blocks[index];
  switch (block.kind) {
    case 'picture':
    case 'paragraph':
      return false;
    case 'item': {
      if (index === 0) {
        return false;
      }
      const above = blocks[index - 1];
      switch (above.kind) {
        case 'picture':
        case 'paragraph':
          return false;
        case 'item':
          return block.indent + 1 <= above.indent + 1;
      }
    }
  }
}

export function canOutdent(blocks: Block[], index: number): boolean {
  const block = blocks[index];
  switch (block.kind) {
    case 'picture':
    case 'paragraph':
      return false;
    case 'item':
      return block.indent > 0;
  }
}

export function selectedRoots(
  blocks: Block[],
  from: number,
  to: number,
): number[] {
  const roots: number[] = [];

  for (let index = from; index <= to; index += 1) {
    const block = blocks[index];
    switch (block.kind) {
      case 'picture':
      case 'paragraph':
        break;
      case 'item': {
        let hasSelectedAncestor = false;
        for (let candidate = index - 1; candidate >= from; candidate -= 1) {
          const previous = blocks[candidate];
          switch (previous.kind) {
            case 'picture':
            case 'paragraph':
              candidate = from - 1;
              break;
            case 'item':
              if (previous.indent < block.indent) {
                hasSelectedAncestor = true;
                candidate = from - 1;
              }
          }
        }
        if (!hasSelectedAncestor) {
          roots.push(index);
        }
      }
    }
  }

  return roots;
}

export function toggleChecked(blocks: Block[], index: number): Block[] {
  const block = blocks[index];
  switch (block.kind) {
    case 'picture':
    case 'paragraph':
      return blocks;
    case 'item': {
      const next = [...blocks];
      next[index] = { ...block, checked: !block.checked };
      return next;
    }
  }
}

export function toggleChecklist(
  blocks: Block[],
  from: number,
  to: number,
  caret: DocCaret,
): EditResult {
  const hasParagraph = blocks.slice(from, to + 1).some((block) => {
    switch (block.kind) {
      case 'picture':
        return false;
      case 'paragraph':
        return true;
      case 'item':
        return false;
    }
  });
  const next = [...blocks];

  if (hasParagraph) {
    for (let index = from; index <= to; index += 1) {
      const block = next[index];
      switch (block.kind) {
        case 'picture':
          break;
        case 'paragraph':
          next[index] = withVisible(
            { kind: 'item', text: '', checked: false, indent: 0 },
            block.text,
            block.spans,
          );
          break;
        case 'item':
          break;
      }
    }
    return { blocks: next, caret };
  }

  for (let index = from; index <= to; index += 1) {
    const block = next[index];
    switch (block.kind) {
      case 'picture':
        break;
      case 'paragraph':
        break;
      case 'item': {
        const end = familyEnd(next, index);
        next[index] = withVisible(
          { kind: 'paragraph', text: '' },
          block.text,
          block.spans,
        );
        for (let descendant = index + 1; descendant <= end; descendant += 1) {
          const child = next[descendant];
          switch (child.kind) {
            case 'picture':
            case 'paragraph':
              break;
            case 'item':
              next[descendant] = { ...child, indent: child.indent - 1 };
          }
        }
      }
    }
  }

  return { blocks: next, caret };
}

function moveSelection(
  blocks: Block[],
  from: number,
  to: number,
  caret: DocCaret,
  delta: 1 | -1,
): EditResult {
  const roots = selectedRoots(blocks, from, to);
  const families = roots.map((root) => ({
    root,
    end: familyEnd(blocks, root),
    movable: delta === 1
      ? canIndent(blocks, root)
      : canOutdent(blocks, root),
  }));
  const next = [...blocks];

  for (const family of families) {
    if (!family.movable) {
      continue;
    }
    for (let index = family.root; index <= family.end; index += 1) {
      const block = next[index];
      switch (block.kind) {
        case 'picture':
        case 'paragraph':
          break;
        case 'item':
          next[index] = { ...block, indent: block.indent + delta };
      }
    }
  }

  return { blocks: next, caret };
}

export function indentSelection(
  blocks: Block[],
  from: number,
  to: number,
  caret: DocCaret,
): EditResult {
  return moveSelection(blocks, from, to, caret, 1);
}

export function outdentSelection(
  blocks: Block[],
  from: number,
  to: number,
  caret: DocCaret,
): EditResult {
  return moveSelection(blocks, from, to, caret, -1);
}

export function enterAt(blocks: Block[], caret: DocCaret): EditResult {
  const block = blocks[caret.index];
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next.splice(caret.index + 1, 0, { kind: 'paragraph', text: '' });
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: 0 },
      };
    }
    case 'paragraph': {
      if (isUrlLine(block.text)) {
        const next = [...blocks];
        next.splice(
          caret.index,
          1,
          stampWordLinks(block),
          { kind: 'paragraph', text: '' },
        );
        return {
          blocks: next,
          caret: { index: caret.index + 1, offset: 0 },
        };
      }
      const head = sliceVisible(block.text, block.spans, 0, caret.offset);
      const tail = sliceVisible(
        block.text,
        block.spans,
        caret.offset,
        block.text.length,
      );
      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        reconcileWordLinks(
          withVisible({ kind: 'paragraph', text: '' }, head.text, head.spans),
        ),
        reconcileWordLinks(
          withVisible({ kind: 'paragraph', text: '' }, tail.text, tail.spans),
        ),
      );
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: 0 },
      };
    }
    case 'item': {
      if (block.text === '') {
        if (block.indent > 0) {
          return outdentSelection(blocks, caret.index, caret.index, caret);
        }
        return toggleChecklist(blocks, caret.index, caret.index, caret);
      }
      if (isUrlLine(block.text)) {
        const next = [...blocks];
        next.splice(
          caret.index,
          1,
          stampWordLinks(block),
          {
            kind: 'item',
            text: '',
            checked: false,
            indent: block.indent,
          },
        );
        return {
          blocks: next,
          caret: { index: caret.index + 1, offset: 0 },
        };
      }

      const head = sliceVisible(block.text, block.spans, 0, caret.offset);
      const tail = sliceVisible(
        block.text,
        block.spans,
        caret.offset,
        block.text.length,
      );
      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        reconcileWordLinks(withVisible(block, head.text, head.spans)),
        reconcileWordLinks(
          withVisible(
            {
              kind: 'item',
              text: '',
              checked: false,
              indent: block.indent,
            },
            tail.text,
            tail.spans,
          ),
        ),
      );
      return {
        blocks: next,
        caret: { index: caret.index + 1, offset: 0 },
      };
    }
  }
}

export function backspaceAtStart(
  blocks: Block[],
  caret: DocCaret,
): EditResult | null {
  if (caret.offset !== 0) {
    return null;
  }

  const block = blocks[caret.index];
  if (block.kind !== 'picture' && caret.index > 0) {
    const previousIndex = caret.index - 1;
    if (blocks[previousIndex].kind === 'picture') {
      return {
        blocks,
        caret: { index: previousIndex, offset: 0 },
      };
    }
  }
  switch (block.kind) {
    case 'picture': {
      const next = [...blocks];
      next.splice(caret.index, 1);
      if (next.length === 0) {
        return {
          blocks: [{ kind: 'paragraph', text: '' }],
          caret: { index: 0, offset: 0 },
        };
      }
      if (caret.index === 0) {
        return {
          blocks: next,
          caret: { index: 0, offset: 0 },
        };
      }
      const previousIndex = Math.max(0, caret.index - 1);
      return {
        blocks: next,
        caret: {
          index: previousIndex,
          offset: blockLength(next[previousIndex]),
        },
      };
    }
    case 'item':
      if (block.indent > 0) {
        return outdentSelection(blocks, caret.index, caret.index, caret);
      }
      return toggleChecklist(blocks, caret.index, caret.index, caret);
    case 'paragraph': {
      if (caret.index === 0) {
        return { blocks, caret };
      }

      const previousIndex = caret.index - 1;
      const previous = blocks[previousIndex];
      switch (previous.kind) {
        case 'picture':
          return {
            blocks,
            caret: { index: previousIndex, offset: 0 },
          };
        case 'paragraph':
        case 'item': {
          const joinOffset = blockLength(previous);
          const next = [...blocks];
          const joined = concatVisible(previous, block);
          next[previousIndex] = reconcileWordLinks(
            withVisible(previous, joined.text, joined.spans),
          );
          next.splice(caret.index, 1);
          return {
            blocks: next,
            caret: { index: previousIndex, offset: joinOffset },
          };
        }
      }
    }
  }
}

export function selectionHasMark(
  blocks: Block[],
  start: DocCaret,
  end: DocCaret,
  mark: NoteMark,
): boolean {
  const [from, to] = ordered(start, end);
  if (from.index === to.index && from.offset === to.offset) {
    return false;
  }
  let any = false;
  for (let index = from.index; index <= to.index; index += 1) {
    const block = blocks[index];
    if (block.kind === 'picture') {
      continue;
    }
    const fromOff = index === from.index ? from.offset : 0;
    const toOff = index === to.index ? to.offset : block.text.length;
    if (fromOff >= toOff) {
      continue;
    }
    any = true;
    if (
      !rangeHasMark(
        block.text,
        block.spans,
        fromOff,
        toOff,
        mark,
      )
    ) {
      return false;
    }
  }
  return any;
}

export function toggleMarkInRange(
  blocks: Block[],
  start: DocCaret,
  end: DocCaret,
  caret: DocCaret,
  mark: NoteMark,
): EditResult {
  const [from, to] = ordered(start, end);
  if (from.index === to.index && from.offset === to.offset) {
    return { blocks, caret };
  }
  const value = !selectionHasMark(blocks, from, to, mark);
  const next = [...blocks];
  for (let index = from.index; index <= to.index; index += 1) {
    const block = next[index];
    if (block.kind === 'picture') {
      continue;
    }
    const fromOff = index === from.index ? from.offset : 0;
    const toOff = index === to.index ? to.offset : block.text.length;
    const updated = applyMark(
      block.text,
      block.spans,
      fromOff,
      toOff,
      mark,
      value,
    );
    next[index] = withVisible(block, updated.text, updated.spans);
  }
  return { blocks: next, caret };
}
