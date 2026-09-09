import { type Block, stripMarks } from './noteDoc';

export const NOTE_CLIPBOARD_TYPE = 'application/x-masa-note-blocks';

export function copyOut(blocks: Block[]): string {
  return blocks
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
      }
    })
    .join('\n');
}

export function stripIncoming(raw: string): string {
  return stripMarks(raw);
}

export function joinIntoLine(raw: string): string {
  const stripped = stripIncoming(raw);
  const pieces = stripped.split(/\r?\n/);
  if (pieces[pieces.length - 1] === '') {
    pieces.pop();
  }
  return pieces.join(' ');
}
