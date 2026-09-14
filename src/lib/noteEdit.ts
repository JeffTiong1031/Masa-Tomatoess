import { joinIntoLine, stripIncoming } from './noteCopy';
import { decodeBody, encodeBody, withVisible, type Block } from './noteDoc';
import {
  applyMark,
  concatVisible,
  deleteVisible,
  insertVisible,
  rangeHasMark,
  sliceVisible,
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

export function ordered(a: DocCaret, b: DocCaret): [DocCaret, DocCaret] {
  if (a.index < b.index || (a.index === b.index && a.offset <= b.offset)) {
    return [a, b];
  }
  return [b, a];
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
    const visible = deleteVisible(first.text, first.spans, from.offset, to.offset);
    next[from.index] = withVisible(first, visible.text, visible.spans);
    return { blocks: next, caret: from };
  }

  const headVisible = sliceVisible(first.text, first.spans, 0, from.offset);
  const tailVisible = sliceVisible(
    last.text,
    last.spans,
    to.offset,
    last.text.length,
  );
  const head = withVisible(first, headVisible.text, headVisible.spans);
  const tail = withVisible(last, tailVisible.text, tailVisible.spans);
  next.splice(
    from.index,
    to.index - from.index + 1,
    ...(tail.text === '' ? [head] : [head, tail]),
  );
  return { blocks: next, caret: from };
}

export function insertText(
  blocks: Block[],
  caret: DocCaret,
  text: string,
  style?: NoteStyle,
): EditResult {
  const block = blocks[caret.index];
  const next = [...blocks];
  const inserted = insertVisible(
    block.text,
    block.spans,
    caret.offset,
    text,
    style,
  );
  next[caret.index] = withVisible(block, inserted.text, inserted.spans);

  return {
    blocks: next,
    caret: { index: caret.index, offset: caret.offset + text.length },
  };
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
        offset: blocks[caret.index - 1].text.length,
      };
    case 'ArrowRight':
      if (caret.offset < block.text.length) {
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
        offset: Math.min(caret.offset, blocks[caret.index - 1].text.length),
      };
    case 'ArrowDown':
      if (caret.index === blocks.length - 1) {
        return { index: caret.index, offset: block.text.length };
      }
      return {
        index: caret.index + 1,
        offset: Math.min(caret.offset, blocks[caret.index + 1].text.length),
      };
    case 'Home':
      return { index: caret.index, offset: 0 };
    case 'End':
      return { index: caret.index, offset: block.text.length };
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
    case 'item':
      return insertText(deleted.blocks, deleted.caret, joinIntoLine(raw));
    case 'paragraph': {
      const incoming = decodeBody(stripIncoming(raw).replaceAll('\r\n', '\n'));
      if (incoming.length === 1) {
        return insertText(deleted.blocks, deleted.caret, incoming[0].text);
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
        return withVisible(
          { kind: 'paragraph', text: '' },
          visible.text,
          visible.spans,
        );
      });
      const next = [...deleted.blocks];
      next.splice(deleted.caret.index, 1, ...paragraphs);
      return {
        blocks: next,
        caret: {
          index: deleted.caret.index + paragraphs.length - 1,
          offset: incoming[incoming.length - 1].text.length,
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
  const prefix: Block[] = [];
  const suffix: Block[] = [];

  switch (block.kind) {
    case 'paragraph':
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
    case 'item':
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
  }

  const next = [...deleted.blocks];
  next.splice(deleted.caret.index, 1, ...prefix, ...inserted, ...suffix);
  const caretIndex = deleted.caret.index + prefix.length + inserted.length - 1;
  return {
    blocks: next,
    caret: {
      index: caretIndex,
      offset: inserted[inserted.length - 1].text.length,
    },
  };
}

export function familyEnd(blocks: Block[], index: number): number {
  const root = blocks[index];
  switch (root.kind) {
    case 'paragraph':
      return index;
    case 'item': {
      let end = index;
      for (let candidate = index + 1; candidate < blocks.length; candidate += 1) {
        const block = blocks[candidate];
        switch (block.kind) {
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
    case 'paragraph':
      return false;
    case 'item': {
      if (index === 0) {
        return false;
      }
      const above = blocks[index - 1];
      switch (above.kind) {
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
      case 'paragraph':
        break;
      case 'item': {
        let hasSelectedAncestor = false;
        for (let candidate = index - 1; candidate >= from; candidate -= 1) {
          const previous = blocks[candidate];
          switch (previous.kind) {
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
  const head = sliceVisible(block.text, block.spans, 0, caret.offset);
  const tail = sliceVisible(
    block.text,
    block.spans,
    caret.offset,
    block.text.length,
  );
  switch (block.kind) {
    case 'paragraph': {
      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        withVisible({ kind: 'paragraph', text: '' }, head.text, head.spans),
        withVisible({ kind: 'paragraph', text: '' }, tail.text, tail.spans),
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

      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        withVisible(block, head.text, head.spans),
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
  switch (block.kind) {
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
      const joinOffset = previous.text.length;
      const next = [...blocks];
      const joined = concatVisible(previous, block);
      next[previousIndex] = withVisible(
        previous,
        joined.text,
        joined.spans,
      );
      next.splice(caret.index, 1);
      return {
        blocks: next,
        caret: { index: previousIndex, offset: joinOffset },
      };
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
    const fromOff = index === from.index ? from.offset : 0;
    const toOff = index === to.index ? to.offset : blocks[index].text.length;
    if (fromOff >= toOff) {
      continue;
    }
    any = true;
    if (
      !rangeHasMark(
        blocks[index].text,
        blocks[index].spans,
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
    const fromOff = index === from.index ? from.offset : 0;
    const toOff = index === to.index ? to.offset : next[index].text.length;
    const updated = applyMark(
      next[index].text,
      next[index].spans,
      fromOff,
      toOff,
      mark,
      value,
    );
    next[index] = withVisible(next[index], updated.text, updated.spans);
  }
  return { blocks: next, caret };
}
