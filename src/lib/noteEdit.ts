import type { Block } from './noteDoc';

export interface DocCaret {
  index: number;
  offset: number;
}

export interface EditResult {
  blocks: Block[];
  caret: DocCaret;
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
