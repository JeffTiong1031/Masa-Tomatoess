export type NoteMark = 'bold' | 'underline' | 'link';

export type NoteStyle = {
  bold: boolean;
  underline: boolean;
  link: boolean;
};

export type NoteSpan = {
  start: number;
  end: number;
  bold: boolean;
  underline: boolean;
  link: boolean;
};

export const PLAIN_STYLE: NoteStyle = {
  bold: false,
  underline: false,
  link: false,
};

export function styleAt(
  spans: NoteSpan[] | undefined,
  index: number,
): NoteStyle {
  for (const span of spans ?? []) {
    if (index >= span.start && index < span.end) {
      return { bold: span.bold, underline: span.underline, link: span.link };
    }
  }
  return PLAIN_STYLE;
}

export function inheritStyle(
  text: string,
  spans: NoteSpan[] | undefined,
  offset: number,
): NoteStyle {
  if (text.length === 0) {
    return PLAIN_STYLE;
  }
  return styleAt(spans, offset > 0 ? offset - 1 : 0);
}

export function stylesFor(
  text: string,
  spans: NoteSpan[] | undefined,
): NoteStyle[] {
  const styles: NoteStyle[] = [];
  for (let index = 0; index < text.length; index += 1) {
    styles.push(PLAIN_STYLE);
  }
  for (const span of spans ?? []) {
    const from = Math.max(0, span.start);
    const to = Math.min(text.length, span.end);
    for (let index = from; index < to; index += 1) {
      styles[index] = {
        bold: span.bold,
        underline: span.underline,
        link: span.link,
      };
    }
  }
  return styles;
}

export function compactSpans(styles: NoteStyle[]): NoteSpan[] {
  const spans: NoteSpan[] = [];
  let index = 0;
  while (index < styles.length) {
    const current = styles[index];
    if (!current.bold && !current.underline && !current.link) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (
      end < styles.length &&
      styles[end].bold === current.bold &&
      styles[end].underline === current.underline &&
      styles[end].link === current.link
    ) {
      end += 1;
    }
    spans.push({
      start: index,
      end,
      bold: current.bold,
      underline: current.underline,
      link: current.link,
    });
    index = end;
  }
  return spans;
}

export function visibleFields(
  text: string,
  spans: NoteSpan[],
): { text: string; spans?: NoteSpan[] } {
  if (spans.length === 0) {
    return { text };
  }
  return { text, spans };
}

export function noteRuns(
  text: string,
  spans: NoteSpan[] | undefined,
): { text: string; bold: boolean; underline: boolean; link: boolean }[] {
  const styles = stylesFor(text, spans);
  const runs: { text: string; bold: boolean; underline: boolean; link: boolean }[] =
    [];
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
    runs.push({
      text: text.slice(index, end),
      bold: current.bold,
      underline: current.underline,
      link: current.link,
    });
    index = end;
  }
  if (runs.length === 0) {
    return [{ text, bold: false, underline: false, link: false }];
  }
  return runs;
}

export function spansFromLeaves(
  leaves: { text: string; bold: boolean; underline: boolean; link: boolean }[],
): { text: string; spans?: NoteSpan[] } {
  const text = leaves.map((leaf) => leaf.text).join('');
  const styles: NoteStyle[] = [];
  for (const leaf of leaves) {
    for (let index = 0; index < leaf.text.length; index += 1) {
      styles.push({
        bold: leaf.bold,
        underline: leaf.underline,
        link: leaf.link,
      });
    }
  }
  return visibleFields(text, compactSpans(styles));
}

export function sliceVisible(
  text: string,
  spans: NoteSpan[] | undefined,
  start: number,
  end: number,
): { text: string; spans?: NoteSpan[] } {
  return visibleFields(
    text.slice(start, end),
    compactSpans(stylesFor(text, spans).slice(start, end)),
  );
}

export function concatVisible(
  left: { text: string; spans?: NoteSpan[] },
  right: { text: string; spans?: NoteSpan[] },
): { text: string; spans?: NoteSpan[] } {
  return visibleFields(
    left.text + right.text,
    compactSpans([
      ...stylesFor(left.text, left.spans),
      ...stylesFor(right.text, right.spans),
    ]),
  );
}

export function insertVisible(
  text: string,
  spans: NoteSpan[] | undefined,
  offset: number,
  inserted: string,
  style?: NoteStyle,
): { text: string; spans?: NoteSpan[] } {
  const used = style ?? inheritStyle(text, spans, offset);
  const styles = stylesFor(text, spans);
  const insertedStyles: NoteStyle[] = [];
  for (let index = 0; index < inserted.length; index += 1) {
    insertedStyles.push({
      bold: used.bold,
      underline: used.underline,
      link: used.link,
    });
  }
  return visibleFields(
    text.slice(0, offset) + inserted + text.slice(offset),
    compactSpans([
      ...styles.slice(0, offset),
      ...insertedStyles,
      ...styles.slice(offset),
    ]),
  );
}

export function deleteVisible(
  text: string,
  spans: NoteSpan[] | undefined,
  start: number,
  end: number,
): { text: string; spans?: NoteSpan[] } {
  const styles = stylesFor(text, spans);
  return visibleFields(
    text.slice(0, start) + text.slice(end),
    compactSpans([...styles.slice(0, start), ...styles.slice(end)]),
  );
}

export function rangeHasMark(
  text: string,
  spans: NoteSpan[] | undefined,
  start: number,
  end: number,
  mark: NoteMark,
): boolean {
  if (start >= end) {
    return false;
  }
  const styles = stylesFor(text, spans);
  const from = Math.max(0, start);
  const to = Math.min(end, styles.length);
  if (from >= to) {
    return false;
  }
  for (let index = from; index < to; index += 1) {
    switch (mark) {
      case 'bold':
        if (!styles[index].bold) {
          return false;
        }
        break;
      case 'underline':
        if (!styles[index].underline) {
          return false;
        }
        break;
      case 'link':
        if (!styles[index].link) {
          return false;
        }
        break;
    }
  }
  return true;
}

export function applyMark(
  text: string,
  spans: NoteSpan[] | undefined,
  start: number,
  end: number,
  mark: NoteMark,
  value: boolean,
): { text: string; spans?: NoteSpan[] } {
  if (start >= end) {
    return visibleFields(text, compactSpans(stylesFor(text, spans)));
  }
  const styles = stylesFor(text, spans);
  for (let index = start; index < end; index += 1) {
    switch (mark) {
      case 'bold':
        styles[index] = { ...styles[index], bold: value };
        break;
      case 'underline':
        styles[index] = { ...styles[index], underline: value };
        break;
      case 'link':
        styles[index] = { ...styles[index], link: value };
        break;
    }
  }
  return visibleFields(text, compactSpans(styles));
}
