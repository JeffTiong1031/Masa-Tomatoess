'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckSquare2, Square } from 'lucide-react';
import {
  backspaceAtStart,
  blockLength,
  canIndent as canIndentBlock,
  canOutdent as canOutdentBlock,
  deleteSelection,
  enterAt,
  extendCaret,
  indentSelection,
  insertPicture,
  insertText,
  ordered,
  outdentSelection,
  pasteExternal,
  pasteInternal,
  selectedRoots,
  selectionHasMark,
  toggleChecked,
  toggleChecklist,
  toggleMarkInRange,
  typeOverRange,
  type CaretMove,
  type DocCaret,
  type NoteMark,
  type NoteStyle,
} from '@/lib/noteEdit';
import { copyOut, NOTE_CLIPBOARD_TYPE } from '@/lib/noteCopy';
import { decodeBody, encodeBody, withVisible, type Block } from '@/lib/noteDoc';
import {
  beforeInputAction,
  clipboardAction,
  shouldCommitFromInput,
  shouldReplaceEditorBody,
  shouldRestoreCaretAfterTextCommit,
} from '@/lib/noteEditorPolicy';
import {
  EMPTY_HISTORY,
  redoTo,
  remember,
  undoTo,
  type NoteSnapshot,
} from '@/lib/noteHistory';
import {
  noteLineGapStyle,
  noteTickLineBox,
  type NoteLineGap,
} from '@/lib/noteLineGap';
import {
  NOTE_SELECTION_FILL,
  noteSelectionSlice,
} from '@/lib/noteSelectionPaint';
import { isPictureMime } from '@/lib/notePicture';
import { shrinkNotePicture } from '@/lib/notePictureFile';
import {
  isChecklistHotkey,
  isEditorCommandBlocked,
  isStyleHotkey,
} from '@/lib/noteShortcut';
import {
  inheritStyle,
  noteRuns,
  sliceVisible,
  spansFromLeaves,
  type NoteSpan,
} from '@/lib/noteStyle';

const ITEM_INDENT_PX = 24;

export interface NotesCaretInfo {
  inWords: boolean;
  inChecklist: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  bold: boolean;
  underline: boolean;
}

export interface NotesEditorHandle {
  toggle: () => void;
  indent: () => void;
  outdent: () => void;
  bold: () => void;
  underline: () => void;
  insertPicture: () => void;
}

interface NotesEditorProps {
  body: string;
  lineGap: NoteLineGap;
  disabled?: boolean;
  onChange: (body: string) => void;
  onCaret: (info: NotesCaretInfo) => void;
}

interface EditorSelection {
  start: DocCaret;
  end: DocCaret;
  focus: DocCaret;
}

const CARET_MOVES = new Set<string>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

function collapsedRange(start: DocCaret, end: DocCaret): boolean {
  return start.index === end.index && start.offset === end.offset;
}

function rangeHasItem(blocks: Block[], from: number, to: number): boolean {
  for (let index = from; index <= to; index += 1) {
    switch (blocks[index].kind) {
      case 'item':
        return true;
      case 'paragraph':
      case 'picture':
        break;
    }
  }
  return false;
}

function caretLineTop(element: HTMLSpanElement, offset: number): number {
  const point = textPoint(element, offset);
  const range = document.createRange();
  range.setStart(point.node, point.offset);
  range.collapse(true);
  return range.getBoundingClientRect().top;
}

function caretOnFirstVisualLine(
  element: HTMLSpanElement,
  offset: number,
): boolean {
  return Math.abs(caretLineTop(element, offset) - caretLineTop(element, 0)) < 2;
}

function caretOnLastVisualLine(
  element: HTMLSpanElement,
  offset: number,
  length: number,
): boolean {
  return (
    Math.abs(caretLineTop(element, offset) - caretLineTop(element, length)) < 2
  );
}

function slicedBlock(block: Block, start: number, end: number): Block {
  switch (block.kind) {
    case 'picture':
      return block;
    case 'paragraph':
    case 'item': {
      const sliced = sliceVisible(block.text, block.spans, start, end);
      return withVisible(block, sliced.text, sliced.spans);
    }
  }
}

function inheritedStyleFor(block: Block, offset: number): NoteStyle {
  switch (block.kind) {
    case 'picture':
      return { bold: false, underline: false };
    case 'paragraph':
    case 'item':
      return inheritStyle(block.text, block.spans, offset);
  }
}

function textPoint(
  element: HTMLElement,
  offset: number,
): { node: Node; offset: number } {
  let remaining = offset;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  if (!node) {
    return { node: element, offset: 0 };
  }
  for (;;) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      return { node, offset: remaining };
    }
    remaining -= length;
    const next = walker.nextNode();
    if (!next) {
      return { node, offset: length };
    }
    node = next;
  }
}

function leavesFrom(
  element: HTMLElement,
): { text: string; bold: boolean; underline: boolean }[] {
  const leaves: { text: string; bold: boolean; underline: boolean }[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    leaves.push({
      text: node.textContent ?? '',
      bold: Boolean(parent?.closest('strong, b')),
      underline:
        Boolean(parent?.closest('u')) || Boolean(parent?.closest('.underline')),
    });
    node = walker.nextNode();
  }
  return leaves;
}

function noteRunNodes(text: string, spans?: NoteSpan[]): ReactNode {
  const runs = noteRuns(text, spans);
  if (runs.length === 1 && !runs[0].bold && !runs[0].underline) {
    return text;
  }
  return runs.map((run, index) => {
    if (!run.bold && !run.underline) {
      return run.text;
    }
    if (run.bold) {
      return (
        <strong key={index} className={run.underline ? 'underline' : undefined}>
          {run.text}
        </strong>
      );
    }
    return <u key={index}>{run.text}</u>;
  });
}

export const NotesEditor = forwardRef<NotesEditorHandle, NotesEditorProps>(
  function NotesEditor({ body, lineGap, disabled = false, onChange, onCaret }, ref) {
    const [blocks, setBlocks] = useState<Block[]>(() => decodeBody(body));
    const blocksRef = useRef(blocks);
    const blockNodesRef = useRef<(HTMLSpanElement | null)[]>([]);
    const caretRef = useRef<DocCaret>({ index: 0, offset: 0 });
    const focusedRef = useRef(false);
    const historyRef = useRef(EMPTY_HISTORY);
    const typingRunRef = useRef(false);
    const restoreCaretRef = useRef(false);
    const composingRef = useRef(false);
    const rangeRef = useRef<EditorSelection>({
      start: { index: 0, offset: 0 },
      end: { index: 0, offset: 0 },
      focus: { index: 0, offset: 0 },
    });
    const anchorRef = useRef<DocCaret>({ index: 0, offset: 0 });
    const dragAnchorRef = useRef<DocCaret | null>(null);
    const spanningRef = useRef(false);
    const pendingRef = useRef<NoteStyle | null>(null);
    const [paint, setPaint] = useState<{ start: DocCaret; end: DocCaret } | null>(
      null,
    );
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pictureCaretRef = useRef<DocCaret | null>(null);
    const [marks, setMarks] = useState<
      { top: number; left: number; width: number; height: number }[]
    >([]);

    const reportCaret = (
      nextBlocks: Block[],
      caret: DocCaret,
      inWords = focusedRef.current,
    ) => {
      const from = rangeRef.current.start;
      const to = rangeRef.current.end;
      const inChecklist = inWords && rangeHasItem(nextBlocks, from.index, to.index);
      const roots = selectedRoots(nextBlocks, from.index, to.index);
      const collapsed = collapsedRange(from, to);
      const pending = pendingRef.current;
      const block = nextBlocks[caret.index];
      const inherited = inheritedStyleFor(block, caret.offset);
      onCaret({
        inWords,
        inChecklist,
        canIndent:
          inChecklist &&
          roots.some((index) => canIndentBlock(nextBlocks, index)),
        canOutdent:
          inChecklist &&
          roots.some((index) => canOutdentBlock(nextBlocks, index)),
        bold: inWords
          ? pending
            ? pending.bold
            : collapsed
              ? inherited.bold
              : selectionHasMark(nextBlocks, from, to, 'bold')
          : false,
        underline: inWords
          ? pending
            ? pending.underline
            : collapsed
              ? inherited.underline
              : selectionHasMark(nextBlocks, from, to, 'underline')
          : false,
      });
    };

    const commit = (
      nextBlocks: Block[],
      caret: DocCaret,
      restoreCaret = true,
    ) => {
      blocksRef.current = nextBlocks;
      caretRef.current = caret;
      restoreCaretRef.current = restoreCaret;
      if (!spanningRef.current) {
        rangeRef.current = { start: caret, end: caret, focus: caret };
        anchorRef.current = caret;
        setPaint(null);
      }
      setBlocks(nextBlocks);
      onChange(encodeBody(nextBlocks));
      reportCaret(nextBlocks, caret);
    };

    const snapshot = (): NoteSnapshot => ({
      blocks: blocksRef.current,
      caret: caretRef.current,
    });

    const rememberCurrent = () => {
      typingRunRef.current = false;
      historyRef.current = remember(historyRef.current, snapshot());
    };

    const applyRange = (anchor: DocCaret, focus: DocCaret) => {
      pendingRef.current = null;
      const [start, end] = ordered(anchor, focus);
      anchorRef.current = anchor;
      rangeRef.current = { start, end, focus };
      caretRef.current = focus;
      spanningRef.current = !collapsedRange(start, end);
      setPaint(start.index !== end.index ? { start, end } : null);
      reportCaret(blocksRef.current, focus, true);
    };

    const dropSpan = () => {
      spanningRef.current = false;
      setPaint(null);
    };

    const placeNativeCaret = (caret: DocCaret) => {
      const element = blockNodesRef.current[caret.index];
      if (!element) return;
      const point = textPoint(element, caret.offset);
      const nativeRange = document.createRange();
      nativeRange.setStart(point.node, point.offset);
      nativeRange.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(nativeRange);
    };

    const placeNativeRange = (start: DocCaret, end: DocCaret) => {
      if (start.index !== end.index) {
        placeNativeCaret(rangeRef.current.focus);
        return;
      }
      const element = blockNodesRef.current[start.index];
      if (!element) return;
      const startPoint = textPoint(element, start.offset);
      const endPoint = textPoint(element, end.offset);
      const nativeRange = document.createRange();
      nativeRange.setStart(startPoint.node, startPoint.offset);
      nativeRange.setEnd(endPoint.node, endPoint.offset);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(nativeRange);
    };

    const caretFromPoint = (x: number, y: number): DocCaret | null => {
      const position = document.caretPositionFromPoint?.(x, y);
      if (position) {
        const mapped = pointForNode(position.offsetNode, position.offset);
        if (mapped) return mapped;
      }
      const nativeRange = document.caretRangeFromPoint?.(x, y);
      if (nativeRange) {
        const mapped = pointForNode(
          nativeRange.startContainer,
          nativeRange.startOffset,
        );
        if (mapped) return mapped;
      }
      let nearest: DocCaret | null = null;
      let nearestDist = Number.POSITIVE_INFINITY;
      for (let index = 0; index < blocksRef.current.length; index += 1) {
        const element = blockNodesRef.current[index];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        const dy =
          y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        if (dy < nearestDist) {
          nearestDist = dy;
          nearest = {
            index,
            offset:
              x < rect.left + rect.width / 2
                ? 0
                : blockLength(blocksRef.current[index]),
          };
        }
      }
      return nearest;
    };

    const pointForNode = (
      node: Node | null,
      offset: number,
    ): DocCaret | null => {
      if (!node) return null;
      for (let index = 0; index < blocksRef.current.length; index += 1) {
        const element = blockNodesRef.current[index];
        if (!element || (node !== element && !element.contains(node))) continue;
        const range = document.createRange();
        range.selectNodeContents(element);
        range.setEnd(node, offset);
        return {
          index,
          offset: Math.min(
            range.toString().length,
            element.textContent?.length ??
              blockLength(blocksRef.current[index]),
          ),
        };
      }
      return null;
    };

    const editorSelection = (): EditorSelection => {
      if (spanningRef.current) {
        return rangeRef.current;
      }
      const selection = window.getSelection();
      const anchor = pointForNode(
        selection?.anchorNode ?? null,
        selection?.anchorOffset ?? 0,
      );
      const focus = pointForNode(
        selection?.focusNode ?? null,
        selection?.focusOffset ?? 0,
      );
      if (!anchor || !focus) {
        return rangeRef.current;
      }
      const [start, end] = ordered(anchor, focus);
      const next = { start, end, focus };
      rangeRef.current = next;
      anchorRef.current = anchor;
      caretRef.current = focus;
      return next;
    };

    const selectedFragment = ({ start, end }: EditorSelection): Block[] => {
      const lastIndex =
        end.index > start.index && end.offset === 0 ? end.index - 1 : end.index;
      const fragment: Block[] = [];
      for (let index = start.index; index <= lastIndex; index += 1) {
        const block = blocksRef.current[index];
        fragment.push(
          slicedBlock(
            block,
            index === start.index ? start.offset : 0,
            index === end.index ? end.offset : blockLength(block),
          ),
        );
      }
      return fragment;
    };

    const writeClipboard = (
      event: React.ClipboardEvent<HTMLSpanElement>,
      range: EditorSelection,
    ) => {
      const fragment = selectedFragment(range);
      event.clipboardData.setData('text/plain', copyOut(fragment));
      event.clipboardData.setData(
        NOTE_CLIPBOARD_TYPE,
        encodeBody(fragment),
      );
    };

    const applyText = (index: number, element: HTMLElement, caret: DocCaret) => {
      const current = blocksRef.current;
      const parsed = spansFromLeaves(leavesFrom(element));
      const next = [...current];
      const block = current[index];
      switch (block.kind) {
        case 'picture':
          return;
        case 'paragraph':
        case 'item':
          next[index] = withVisible(block, parsed.text, parsed.spans);
      }
      commit(
        next,
        caret,
        shouldRestoreCaretAfterTextCommit(composingRef.current),
      );
    };

    const applyMark = (mark: NoteMark) => {
      if (composingRef.current) return;
      const current = blocksRef.current;
      const range = editorSelection();
      const collapsed = collapsedRange(range.start, range.end);
      if (collapsed) {
        const pending = pendingRef.current;
        const inherited = inheritedStyleFor(
          current[range.focus.index],
          range.focus.offset,
        );
        const base = pending ?? inherited;
        switch (mark) {
          case 'bold':
            pendingRef.current = { ...base, bold: !base.bold };
            break;
          case 'underline':
            pendingRef.current = { ...base, underline: !base.underline };
            break;
        }
        reportCaret(current, range.focus, true);
        return;
      }
      pendingRef.current = null;
      rememberCurrent();
      const result = toggleMarkInRange(
        current,
        range.start,
        range.end,
        range.focus,
        mark,
      );
      commit(result.blocks, result.caret);
    };

    const applyEnter = (range: EditorSelection) => {
      const collapsed = collapsedRange(range.start, range.end);
      rememberCurrent();
      const base = collapsed
        ? { blocks: blocksRef.current, caret: range.focus }
        : deleteSelection(blocksRef.current, range.start, range.end);
      dropSpan();
      const result = enterAt(base.blocks, base.caret);
      commit(result.blocks, result.caret);
    };

    const updateCaret = (index: number) => {
      const selection = editorSelection();
      const caret =
        selection.focus.index === index
          ? selection.focus
          : { index, offset: caretRef.current.offset };
      caretRef.current = caret;
      reportCaret(blocksRef.current, caret, true);
    };

    useEffect(() => {
      if (!shouldReplaceEditorBody(body, encodeBody(blocksRef.current))) {
        return;
      }
      const next = decodeBody(body);
      const caret = { index: 0, offset: 0 };
      blocksRef.current = next;
      caretRef.current = caret;
      rangeRef.current = { start: caret, end: caret, focus: caret };
      anchorRef.current = caret;
      dropSpan();
      historyRef.current = EMPTY_HISTORY;
      typingRunRef.current = false;
      setBlocks(next);
      const encoded = encodeBody(next);
      if (encoded !== body) onChange(encoded);
    }, [body, onChange]);

    useLayoutEffect(() => {
      const root = editorRef.current;
      if (!root || !paint) {
        setMarks([]);
        return;
      }
      const origin = root.getBoundingClientRect();
      const next: { top: number; left: number; width: number; height: number }[] =
        [];
      for (
        let index = paint.start.index;
        index <= paint.end.index;
        index += 1
      ) {
        const slice = noteSelectionSlice(
          paint.start,
          paint.end,
          index,
          blockLength(blocks[index]),
        );
        if (!slice) continue;
        const element = blockNodesRef.current[index];
        if (!element) continue;
        const startPoint = textPoint(element, slice.start);
        const endPoint = textPoint(element, slice.end);
        if (startPoint.node === element) continue;
        const range = document.createRange();
        range.setStart(startPoint.node, startPoint.offset);
        range.setEnd(endPoint.node, endPoint.offset);
        for (const rect of range.getClientRects()) {
          if (rect.width === 0 || rect.height === 0) continue;
          next.push({
            top: rect.top - origin.top,
            left: rect.left - origin.left,
            width: rect.width,
            height: rect.height,
          });
        }
      }
      setMarks(next);
      placeNativeCaret(rangeRef.current.focus);
    }, [paint, blocks, lineGap]);

    useLayoutEffect(() => {
      if (!restoreCaretRef.current) return;
      restoreCaretRef.current = false;
      const caret = caretRef.current;
      const element = blockNodesRef.current[caret.index];
      if (!element) return;
      if (spanningRef.current) {
        placeNativeRange(rangeRef.current.start, rangeRef.current.end);
        return;
      }
      placeNativeCaret(caret);
    }, [blocks]);

    useImperativeHandle(ref, () => ({
      toggle() {
        if (composingRef.current) return;
        const current = blocksRef.current;
        const range = editorSelection();
        rememberCurrent();
        const result = toggleChecklist(
          current,
          range.start.index,
          range.end.index,
          range.focus,
        );
        commit(result.blocks, result.caret);
      },
      indent() {
        if (composingRef.current) return;
        const current = blocksRef.current;
        const range = editorSelection();
        rememberCurrent();
        const result = indentSelection(
          current,
          range.start.index,
          range.end.index,
          range.focus,
        );
        commit(result.blocks, result.caret);
      },
      outdent() {
        if (composingRef.current) return;
        const current = blocksRef.current;
        const range = editorSelection();
        rememberCurrent();
        const result = outdentSelection(
          current,
          range.start.index,
          range.end.index,
          range.focus,
        );
        commit(result.blocks, result.caret);
      },
      bold() {
        applyMark('bold');
      },
      underline() {
        applyMark('underline');
      },
      insertPicture() {
        pictureCaretRef.current = caretRef.current;
        fileInputRef.current?.click();
      },
    }));

    const gap = noteLineGapStyle(lineGap);

    return (
      <div
        className="mt-note-sel mt-quiet-focus min-h-11 flex-1 overflow-auto bg-[var(--mt-surface)] p-3 text-[var(--mt-text)]"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('[role="checkbox"]')) {
            return;
          }
          const caret = caretFromPoint(event.clientX, event.clientY);
          if (!caret) return;
          if (event.shiftKey) {
            applyRange(anchorRef.current, caret);
            if (event.pointerType === 'mouse') {
              dragAnchorRef.current = anchorRef.current;
            }
          } else {
            applyRange(caret, caret);
            if (event.pointerType === 'mouse') {
              dragAnchorRef.current = caret;
            }
          }
        }}
        onPointerMove={(event) => {
          const origin = dragAnchorRef.current;
          if (!origin || event.buttons === 0) return;
          if (event.pointerType !== 'mouse') return;
          const caret = caretFromPoint(event.clientX, event.clientY);
          if (!caret) return;
          if (caret.index === origin.index && caret.offset === origin.offset) {
            return;
          }
          if (caret.index !== origin.index) {
            event.preventDefault();
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }
          applyRange(origin, caret);
        }}
        onPointerUp={() => {
          dragAnchorRef.current = null;
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }
          focusedRef.current = false;
          reportCaret(blocksRef.current, caretRef.current, false);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            const insertionCaret = pictureCaretRef.current;
            pictureCaretRef.current = null;
            event.currentTarget.value = '';
            if (!file || !isPictureMime(file.type) || !insertionCaret) return;
            const pending = insertPicture(
              blocksRef.current,
              insertionCaret,
              '',
            );
            const pendingPicture = pending.blocks[pending.caret.index];
            rememberCurrent();
            commit(pending.blocks, pending.caret);
            let src: string;
            try {
              src = await shrinkNotePicture(file);
            } catch {
              return;
            }
            const current = blocksRef.current;
            const pendingIndex = current.indexOf(pendingPicture);
            if (pendingIndex === -1) return;
            const next = [...current];
            switch (pendingPicture.kind) {
              case 'picture':
                next[pendingIndex] = { ...pendingPicture, src };
                break;
              case 'paragraph':
              case 'item':
                return;
            }
            commit(next, caretRef.current);
          }}
        />
        <div ref={editorRef} className="relative">
        {marks.map((mark, markIndex) => (
          <span
            key={markIndex}
            aria-hidden
            className="pointer-events-none absolute z-0"
            style={{
              top: mark.top,
              left: mark.left,
              width: mark.width,
              height: mark.height,
              background: NOTE_SELECTION_FILL,
            }}
          />
        ))}
        {blocks.map((block, index) => (
          <div
            key={index}
            className={`relative z-[1] flex items-start ${
              block.kind === 'picture' ? 'min-h-11' : ''
            }`}
            style={{
              paddingLeft:
                block.kind === 'item' ? block.indent * ITEM_INDENT_PX : 0,
              lineHeight: gap.lineHeight,
              paddingBlock: gap.paddingBlock,
            }}
          >
            {block.kind === 'item' && (
              <button
                type="button"
                role="checkbox"
                aria-checked={block.checked}
                aria-label={block.checked ? 'Mark unchecked' : 'Mark checked'}
                className="relative flex min-w-11 shrink-0 items-center justify-center text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)]"
                style={noteTickLineBox(lineGap)}
                disabled={disabled}
                onClick={() => {
                  if (composingRef.current) return;
                  rememberCurrent();
                  const next = toggleChecked(blocksRef.current, index);
                  commit(next, caretRef.current);
                }}
                onPointerDown={(event) => event.preventDefault()}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-1/2 h-11 -translate-y-1/2"
                />
                {block.checked ? (
                  <CheckSquare2 aria-hidden="true" className="size-[1em]" />
                ) : (
                  <Square aria-hidden="true" className="size-[1em]" />
                )}
              </button>
            )}
            <span
              ref={(element) => {
                blockNodesRef.current[index] = element;
              }}
              aria-label={index === 0 ? 'Note' : undefined}
              className={`mt-quiet-focus min-w-0 flex-1 outline-none ${
                paint ? 'select-none' : ''
              } ${
                block.kind === 'item' && block.checked
                  ? 'text-[var(--mt-text-muted)] line-through'
                  : 'text-[var(--mt-text)]'
              }`}
              contentEditable={!disabled}
              suppressContentEditableWarning
              onFocus={() => {
                focusedRef.current = true;
                updateCaret(index);
              }}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={(event) => {
                composingRef.current = false;
                if (disabled) return;
                if (!typingRunRef.current) {
                  historyRef.current = remember(historyRef.current, snapshot());
                  typingRunRef.current = true;
                }
                applyText(
                  index,
                  event.currentTarget,
                  editorSelection().focus,
                );
              }}
              onBeforeInput={(event) => {
                if (composingRef.current || disabled) return;
                const range = editorSelection();
                const collapsed = collapsedRange(range.start, range.end);
                const native = event.nativeEvent;
                if (
                  pendingRef.current &&
                  collapsed &&
                  native.inputType === 'insertText' &&
                  native.data
                ) {
                  event.preventDefault();
                  if (!typingRunRef.current) {
                    historyRef.current = remember(historyRef.current, snapshot());
                    typingRunRef.current = true;
                  }
                  const result = insertText(
                    blocksRef.current,
                    range.focus,
                    native.data,
                    pendingRef.current,
                  );
                  commit(result.blocks, result.caret);
                  return;
                }
                switch (
                  beforeInputAction(
                    native.inputType,
                    collapsed,
                    Boolean(native.data),
                  )
                ) {
                  case 'ignore':
                    return;
                  case 'enter':
                    event.preventDefault();
                    applyEnter(range);
                    return;
                  case 'type-over': {
                    event.preventDefault();
                    rememberCurrent();
                    const result = typeOverRange(
                      blocksRef.current,
                      range.start,
                      range.end,
                      native.data ?? '',
                      pendingRef.current ?? undefined,
                    );
                    dropSpan();
                    commit(result.blocks, result.caret);
                    return;
                  }
                  case 'delete': {
                    event.preventDefault();
                    rememberCurrent();
                    const result = deleteSelection(
                      blocksRef.current,
                      range.start,
                      range.end,
                    );
                    dropSpan();
                    commit(result.blocks, result.caret);
                  }
                }
              }}
              onInput={(event) => {
                if (dragAnchorRef.current || spanningRef.current) return;
                const input = event.nativeEvent as InputEvent;
                if (
                  !shouldCommitFromInput(
                    composingRef.current || input.isComposing,
                  )
                ) {
                  return;
                }
                if (!typingRunRef.current) {
                  historyRef.current = remember(historyRef.current, snapshot());
                  typingRunRef.current = true;
                }
                const caret = editorSelection().focus;
                applyText(
                  index,
                  event.currentTarget,
                  caret,
                );
              }}
              onKeyDown={(event) => {
                const ctrlOrMeta = event.ctrlKey || event.metaKey;
                const key = event.key.toLowerCase();
                if (
                  isEditorCommandBlocked(
                    composingRef.current,
                    event.nativeEvent.isComposing,
                    event.key,
                  )
                ) {
                  if (
                    ctrlOrMeta &&
                    !event.altKey &&
                    (key === 'z' || key === 'y')
                  ) {
                    event.preventDefault();
                  }
                  return;
                }
                const range = editorSelection();
                const collapsed = collapsedRange(range.start, range.end);

                if (ctrlOrMeta && !event.altKey && key === 'a') {
                  event.preventDefault();
                  const last = blocksRef.current.length - 1;
                  applyRange(
                    { index: 0, offset: 0 },
                    {
                      index: last,
                      offset: blockLength(blocksRef.current[last]),
                    },
                  );
                  return;
                }

                const styleMark = isStyleHotkey(
                  event.key,
                  event.shiftKey,
                  ctrlOrMeta,
                  event.altKey,
                );
                if (styleMark) {
                  event.preventDefault();
                  applyMark(styleMark);
                  return;
                }

                if (event.shiftKey && CARET_MOVES.has(event.key) && !ctrlOrMeta) {
                  event.preventDefault();
                  const focus = extendCaret(
                    blocksRef.current,
                    range.focus,
                    event.key as CaretMove,
                  );
                  applyRange(anchorRef.current, focus);
                  placeNativeRange(rangeRef.current.start, rangeRef.current.end);
                  return;
                }

                if (!collapsed && !event.shiftKey && CARET_MOVES.has(event.key) && !ctrlOrMeta) {
                  applyRange(range.focus, range.focus);
                  placeNativeCaret(range.focus);
                  return;
                }

                if (
                  collapsed &&
                  !ctrlOrMeta &&
                  (event.key === 'ArrowUp' || event.key === 'ArrowDown')
                ) {
                  const element = blockNodesRef.current[range.focus.index];
                  const block = blocksRef.current[range.focus.index];
                  if (
                    element &&
                    (event.key === 'ArrowUp'
                      ? !caretOnFirstVisualLine(element, range.focus.offset)
                      : !caretOnLastVisualLine(
                          element,
                          range.focus.offset,
                          blockLength(block),
                        ))
                  ) {
                    return;
                  }
                  event.preventDefault();
                  const focus = extendCaret(
                    blocksRef.current,
                    range.focus,
                    event.key,
                  );
                  applyRange(focus, focus);
                  placeNativeCaret(focus);
                  return;
                }

                if (
                  collapsed &&
                  !ctrlOrMeta &&
                  (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
                ) {
                  const atEdge =
                    event.key === 'ArrowLeft'
                      ? range.focus.offset === 0
                      : range.focus.offset ===
                        blockLength(blocksRef.current[range.focus.index]);
                  if (atEdge) {
                    const focus = extendCaret(
                      blocksRef.current,
                      range.focus,
                      event.key,
                    );
                    if (
                      focus.index !== range.focus.index ||
                      focus.offset !== range.focus.offset
                    ) {
                      event.preventDefault();
                      applyRange(focus, focus);
                      placeNativeCaret(focus);
                      return;
                    }
                  }
                }

                if (
                  !collapsed &&
                  event.key.length === 1 &&
                  !ctrlOrMeta &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  rememberCurrent();
                  const result = typeOverRange(
                    blocksRef.current,
                    range.start,
                    range.end,
                    event.key,
                    pendingRef.current ?? undefined,
                  );
                  dropSpan();
                  commit(result.blocks, result.caret);
                  return;
                }

                if (!collapsed && event.key === 'Backspace') {
                  event.preventDefault();
                  rememberCurrent();
                  const result = deleteSelection(
                    blocksRef.current,
                    range.start,
                    range.end,
                  );
                  dropSpan();
                  commit(result.blocks, result.caret);
                  return;
                }

                if (ctrlOrMeta && !event.altKey && key === 'z') {
                  event.preventDefault();
                  typingRunRef.current = false;
                  const result = event.shiftKey
                    ? redoTo(historyRef.current, snapshot())
                    : undoTo(historyRef.current, snapshot());
                  if (result) {
                    historyRef.current = result.history;
                    commit(result.snapshot.blocks, result.snapshot.caret);
                  }
                  return;
                }

                if (
                  ctrlOrMeta &&
                  !event.altKey &&
                  (key === 'y' || (key === 'z' && event.shiftKey))
                ) {
                  event.preventDefault();
                  typingRunRef.current = false;
                  const result = redoTo(historyRef.current, snapshot());
                  if (result) {
                    historyRef.current = result.history;
                    commit(result.snapshot.blocks, result.snapshot.caret);
                  }
                  return;
                }

                if (
                  isChecklistHotkey(
                    event.key,
                    event.shiftKey,
                    ctrlOrMeta,
                    event.altKey,
                  )
                ) {
                  event.preventDefault();
                  rememberCurrent();
                  const result = toggleChecklist(
                    blocksRef.current,
                    range.start.index,
                    range.end.index,
                    range.focus,
                  );
                  commit(result.blocks, result.caret);
                  return;
                }

                if (
                  event.key === 'Tab' &&
                  rangeHasItem(
                    blocksRef.current,
                    range.start.index,
                    range.end.index,
                  )
                ) {
                  event.preventDefault();
                  rememberCurrent();
                  const result = event.shiftKey
                    ? outdentSelection(
                        blocksRef.current,
                        range.start.index,
                        range.end.index,
                        range.focus,
                      )
                    : indentSelection(
                        blocksRef.current,
                        range.start.index,
                        range.end.index,
                        range.focus,
                      );
                  commit(result.blocks, result.caret);
                  return;
                }

                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyEnter(range);
                  return;
                }

                if (
                  event.key === 'Backspace' &&
                  collapsed &&
                  range.focus.offset === 0
                ) {
                  const result = backspaceAtStart(
                    blocksRef.current,
                    range.focus,
                  );
                  if (result) {
                    event.preventDefault();
                    rememberCurrent();
                    commit(result.blocks, result.caret);
                  }
                }
              }}
              onCopy={(event) => {
                const range = editorSelection();
                if (
                  clipboardAction(
                    collapsedRange(range.start, range.end),
                    'copy',
                  ) === 'let-native'
                ) {
                  return;
                }
                event.preventDefault();
                writeClipboard(event, range);
              }}
              onCut={(event) => {
                const range = editorSelection();
                const action = clipboardAction(
                  collapsedRange(range.start, range.end),
                  'cut',
                );
                if (action === 'let-native') return;
                event.preventDefault();
                if (composingRef.current) return;
                writeClipboard(event, range);
                if (disabled) return;
                rememberCurrent();
                const result = deleteSelection(
                  blocksRef.current,
                  range.start,
                  range.end,
                );
                dropSpan();
                commit(result.blocks, result.caret);
              }}
              onPaste={(event) => {
                event.preventDefault();
                if (disabled || composingRef.current) return;
                const range = editorSelection();
                const internal = event.clipboardData.getData(
                  NOTE_CLIPBOARD_TYPE,
                );
                rememberCurrent();
                const result =
                  internal !== ''
                    ? pasteInternal(
                        blocksRef.current,
                        range.start,
                        range.end,
                        decodeBody(internal),
                      )
                    : pasteExternal(
                        blocksRef.current,
                        range.start,
                        range.end,
                        event.clipboardData.getData('text/plain'),
                      );
                commit(result.blocks, result.caret);
              }}
              onKeyUp={() => updateCaret(index)}
              onPointerUp={() => updateCaret(index)}
            >
              {block.kind === 'picture'
                ? null
                : noteRunNodes(block.text, block.spans)}
            </span>
          </div>
        ))}
        </div>
      </div>
    );
  },
);
