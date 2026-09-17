import {
  compactSpans,
  spansFromLeaves,
  stylesFor,
  visibleFields,
  type NoteSpan,
} from './noteStyle';

export const NOTE_MARK_START = '\u001E';
export const NOTE_MARK_SEP = '\u001F';
export const NOTE_RUN_START = '\u001D';
export const NOTE_RUN_SEP = '\u001C';
export const NOTE_RUN_BOLD = '\u0011';
export const NOTE_RUN_UNDERLINE = '\u0013';
export const NOTE_RUN_LINK = '\u0012';

export type { NoteSpan };

export type ParagraphBlock = {
  kind: 'paragraph';
  text: string;
  spans?: NoteSpan[];
};
export type ItemBlock = {
  kind: 'item';
  text: string;
  checked: boolean;
  indent: number;
  spans?: NoteSpan[];
};
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

const PIC_LINE = new RegExp(
  `^${NOTE_MARK_START}pic/(inline|front)/(\\d+(?:\\.\\d+)?)/(\\d+(?:\\.\\d+)?)/(\\d+(?:\\.\\d+)?)${NOTE_MARK_SEP}(.*)$`,
);

const PIC_PREFIX = `${NOTE_MARK_START}pic/`;

const ITEM_LINE =
  new RegExp(`^${NOTE_MARK_START}([01])/(\\d+)${NOTE_MARK_SEP}(.*)$`);

export function emptyPicture(): PictureBlock {
  return {
    kind: 'picture',
    sit: 'inline',
    width: 1,
    x: 0,
    y: 0.15,
    src: '',
  };
}

export function stripMarks(raw: string): string {
  return raw
    .replaceAll(NOTE_MARK_START, '')
    .replaceAll(NOTE_MARK_SEP, '')
    .replaceAll(NOTE_RUN_START, '')
    .replaceAll(NOTE_RUN_SEP, '')
    .replaceAll(NOTE_RUN_BOLD, '')
    .replaceAll(NOTE_RUN_UNDERLINE, '')
    .replaceAll(NOTE_RUN_LINK, '');
}

export function decodeVisible(
  raw: string,
): { text: string; spans?: NoteSpan[] } {
  if (!raw.includes(NOTE_RUN_START)) {
    return { text: stripMarks(raw) };
  }

  const runs: {
    text: string;
    bold: boolean;
    underline: boolean;
    link: boolean;
  }[] = [];
  let cursor = 0;
  while (cursor < raw.length) {
    if (raw[cursor] !== NOTE_RUN_START) {
      return { text: stripMarks(raw) };
    }
    cursor += 1;
    let bold = false;
    let underline = false;
    let link = false;
    if (raw[cursor] === NOTE_RUN_BOLD) {
      bold = true;
      cursor += 1;
    }
    if (raw[cursor] === NOTE_RUN_UNDERLINE) {
      underline = true;
      cursor += 1;
    }
    if (raw[cursor] === NOTE_RUN_LINK) {
      link = true;
      cursor += 1;
    }
    if (raw[cursor] !== NOTE_RUN_SEP) {
      return { text: stripMarks(raw) };
    }
    cursor += 1;
    const nextStart = raw.indexOf(NOTE_RUN_START, cursor);
    const end = nextStart === -1 ? raw.length : nextStart;
    runs.push({
      text: stripMarks(raw.slice(cursor, end)),
      bold,
      underline,
      link,
    });
    cursor = end;
  }
  return spansFromLeaves(runs);
}

export function encodeVisible(
  text: string,
  spans: NoteSpan[] | undefined,
): string {
  const clean = stripMarks(text);
  const compact = compactSpans(stylesFor(clean, spans));
  if (compact.length === 0) {
    return clean;
  }

  const styles = stylesFor(clean, compact);
  let encoded = '';
  let index = 0;
  while (index < styles.length) {
    const current = styles[index];
    let end = index + 1;
    while (
      end < styles.length &&
      styles[end].bold === current.bold &&
      styles[end].underline === current.underline &&
      styles[end].link === current.link
    ) {
      end += 1;
    }
    const flags =
      (current.bold ? NOTE_RUN_BOLD : '') +
      (current.underline ? NOTE_RUN_UNDERLINE : '') +
      (current.link ? NOTE_RUN_LINK : '');
    encoded += `${NOTE_RUN_START}${flags}${NOTE_RUN_SEP}${clean.slice(index, end)}`;
    index = end;
  }
  return encoded;
}

export function withVisible(
  block: WordBlock,
  text: string,
  spans?: NoteSpan[],
): WordBlock {
  const fields = visibleFields(text, compactSpans(stylesFor(text, spans)));
  switch (block.kind) {
    case 'paragraph':
      return { kind: 'paragraph', ...fields };
    case 'item':
      return {
        kind: 'item',
        checked: block.checked,
        indent: block.indent,
        ...fields,
      };
  }
}

export function decodeLine(raw: string): Block {
  if (raw.startsWith(PIC_PREFIX)) {
    const pic = raw.match(PIC_LINE);
    if (!pic) {
      return emptyPicture();
    }
    return {
      kind: 'picture',
      sit: pic[1] as PictureSit,
      width: Number(pic[2]),
      x: Number(pic[3]),
      y: Number(pic[4]),
      src: pic[5],
    };
  }
  const match = raw.match(ITEM_LINE);
  if (match) {
    const visible = decodeVisible(match[3]);
    return withVisible(
      {
        kind: 'item',
        text: '',
        checked: match[1] === '1',
        indent: Number(match[2]),
      },
      visible.text,
      visible.spans,
    );
  }
  const visible = decodeVisible(raw);
  return withVisible(
    { kind: 'paragraph', text: '' },
    visible.text,
    visible.spans,
  );
}

export function encodeLine(block: Block): string {
  switch (block.kind) {
    case 'item':
      return `${NOTE_MARK_START}${block.checked ? '1' : '0'}/${block.indent}${NOTE_MARK_SEP}${encodeVisible(block.text, block.spans)}`;
    case 'paragraph':
      return encodeVisible(block.text, block.spans);
    case 'picture':
      return `${NOTE_MARK_START}pic/${block.sit}/${block.width}/${block.x}/${block.y}${NOTE_MARK_SEP}${block.src}`;
  }
}

export function decodeBody(body: string): Block[] {
  if (body === '') {
    return [{ kind: 'paragraph', text: '' }];
  }
  return body.split('\n').map(decodeLine);
}

export function encodeBody(blocks: Block[]): string {
  if (
    blocks.length === 1 &&
    blocks[0].kind === 'paragraph' &&
    blocks[0].text === ''
  ) {
    return '';
  }
  return blocks.map(encodeLine).join('\n');
}
