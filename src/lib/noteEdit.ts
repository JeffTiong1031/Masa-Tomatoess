import { joinIntoLine, stripIncoming } from './noteCopy';
import { decodeBody, encodeBody, type Block } from './noteDoc';

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
    const text = first.text.slice(0, from.offset) + first.text.slice(to.offset);
    switch (first.kind) {
      case 'paragraph':
        next[from.index] = { kind: 'paragraph', text };
        break;
      case 'item':
        next[from.index] = { ...first, text };
    }
    return { blocks: next, caret: from };
  }

  const text = first.text.slice(0, from.offset) + last.text.slice(to.offset);
  switch (first.kind) {
    case 'paragraph':
      next.splice(
        from.index,
        to.index - from.index + 1,
        { kind: 'paragraph', text },
      );
      break;
    case 'item':
      next.splice(
        from.index,
        to.index - from.index + 1,
        { ...first, text },
      );
  }
  return { blocks: next, caret: from };
}

export function insertText(
  blocks: Block[],
  caret: DocCaret,
  text: string,
): EditResult {
  const block = blocks[caret.index];
  const next = [...blocks];
  const inserted = block.text.slice(0, caret.offset) + text + block.text.slice(caret.offset);

  switch (block.kind) {
    case 'paragraph':
      next[caret.index] = { kind: 'paragraph', text: inserted };
      break;
    case 'item':
      next[caret.index] = { ...block, text: inserted };
  }

  return {
    blocks: next,
    caret: { index: caret.index, offset: caret.offset + text.length },
  };
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

      const prefix = block.text.slice(0, deleted.caret.offset);
      const suffix = block.text.slice(deleted.caret.offset);
      const paragraphs = incoming.map((line, index): Block => {
        const leading = index === 0 ? prefix : '';
        const trailing = index === incoming.length - 1 ? suffix : '';
        return { kind: 'paragraph', text: leading + line.text + trailing };
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
  const prefixText = block.text.slice(0, deleted.caret.offset);
  const suffixText = block.text.slice(deleted.caret.offset);
  const prefix: Block[] = [];
  const suffix: Block[] = [];

  switch (block.kind) {
    case 'paragraph':
      if (prefixText !== '') {
        prefix.push({ kind: 'paragraph', text: prefixText });
      }
      if (suffixText !== '') {
        suffix.push({ kind: 'paragraph', text: suffixText });
      }
      break;
    case 'item':
      if (prefixText !== '') {
        prefix.push({ ...block, text: prefixText });
      }
      if (suffixText !== '') {
        suffix.push({ ...block, text: suffixText, checked: false });
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
          next[index] = {
            kind: 'item',
            text: block.text,
            checked: false,
            indent: 0,
          };
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
        next[index] = { kind: 'paragraph', text: block.text };
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
  switch (block.kind) {
    case 'paragraph': {
      const next = [...blocks];
      next.splice(
        caret.index,
        1,
        { kind: 'paragraph', text: block.text.slice(0, caret.offset) },
        { kind: 'paragraph', text: block.text.slice(caret.offset) },
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
        { ...block, text: block.text.slice(0, caret.offset) },
        {
          kind: 'item',
          text: block.text.slice(caret.offset),
          checked: false,
          indent: block.indent,
        },
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
      switch (previous.kind) {
        case 'paragraph':
          next[previousIndex] = {
            kind: 'paragraph',
            text: previous.text + block.text,
          };
          break;
        case 'item':
          next[previousIndex] = {
            ...previous,
            text: previous.text + block.text,
          };
      }
      next.splice(caret.index, 1);
      return {
        blocks: next,
        caret: { index: previousIndex, offset: joinOffset },
      };
    }
  }
}
