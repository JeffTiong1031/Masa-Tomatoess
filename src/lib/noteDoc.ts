export const NOTE_MARK_START = '\u001E';
export const NOTE_MARK_SEP = '\u001F';

export type ParagraphBlock = { kind: 'paragraph'; text: string };
export type ItemBlock = {
  kind: 'item';
  text: string;
  checked: boolean;
  indent: number;
};
export type Block = ParagraphBlock | ItemBlock;

const ITEM_LINE =
  new RegExp(`^${NOTE_MARK_START}([01])/(\\d+)${NOTE_MARK_SEP}(.*)$`);

export function stripMarks(raw: string): string {
  return raw.replaceAll(NOTE_MARK_START, '').replaceAll(NOTE_MARK_SEP, '');
}

export function decodeLine(raw: string): Block {
  const match = raw.match(ITEM_LINE);
  if (match) {
    return {
      kind: 'item',
      text: match[3],
      checked: match[1] === '1',
      indent: Number(match[2]),
    };
  }
  return { kind: 'paragraph', text: stripMarks(raw) };
}

export function encodeLine(block: Block): string {
  switch (block.kind) {
    case 'item':
      return `${NOTE_MARK_START}${block.checked ? '1' : '0'}/${block.indent}${NOTE_MARK_SEP}${block.text}`;
    case 'paragraph':
      return stripMarks(block.text);
  }
}

export function decodeBody(body: string): Block[] {
  if (body === '') {
    return [{ kind: 'paragraph', text: '' }];
  }
  return body.split('\n').map(decodeLine);
}

export function encodeBody(blocks: Block[]): string {
  if (blocks.length === 1 && blocks[0].kind === 'paragraph' && blocks[0].text === '') {
    return '';
  }
  return blocks.map(encodeLine).join('\n');
}
