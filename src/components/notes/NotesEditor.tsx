'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { CheckSquare, Square } from 'lucide-react';
import {
  backspaceAtStart,
  canIndent as canIndentBlock,
  canOutdent as canOutdentBlock,
  deleteSelection,
  enterAt,
  extendCaret,
  indentSelection,
  insertText,
  ordered,
  outdentSelection,
  pasteExternal,
  pasteInternal,
  selectedRoots,
  toggleChecked,
  toggleChecklist,
  typeOverRange,
  type CaretMove,
  type DocCaret,
} from '@/lib/noteEdit';
import { copyOut, NOTE_CLIPBOARD_TYPE } from '@/lib/noteCopy';
import { decodeBody, encodeBody, type Block } from '@/lib/noteDoc';
import {
  EMPTY_HISTORY,
  redoTo,
  remember,
  undoTo,
  type NoteSnapshot,
} from '@/lib/noteHistory';
import {
  isChecklistHotkey,
  isEditorCommandBlocked,
} from '@/lib/noteShortcut';

const ITEM_INDENT_PX = 24;

export interface NotesCaretInfo {
  inWords: boolean;
  inChecklist: boolean;
  canIndent: boolean;
  canOutdent: boolean;
}

export interface NotesEditorHandle {
  toggle: () => void;
  indent: () => void;
  outdent: () => void;
}

interface NotesEditorProps {
  body: string;
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
        break;
    }
  }
  return false;
}

function slicedBlock(block: Block, start: number, end: number): Block {
  switch (block.kind) {
    case 'paragraph':
      return { kind: 'paragraph', text: block.text.slice(start, end) };
    case 'item':
      return { ...block, text: block.text.slice(start, end) };
  }
}

export const NotesEditor = forwardRef<NotesEditorHandle, NotesEditorProps>(
  function NotesEditor({ body, disabled = false, onChange, onCaret }, ref) {
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
    const [paint, setPaint] = useState<{ start: DocCaret; end: DocCaret } | null>(
      null,
    );

    const reportCaret = (
      nextBlocks: Block[],
      caret: DocCaret,
      inWords = focusedRef.current,
    ) => {
      const from = rangeRef.current.start;
      const to = rangeRef.current.end;
      const inChecklist = inWords && rangeHasItem(nextBlocks, from.index, to.index);
      const roots = selectedRoots(nextBlocks, from.index, to.index);
      onCaret({
        inWords,
        inChecklist,
        canIndent:
          inChecklist &&
          roots.some((index) => canIndentBlock(nextBlocks, index)),
        canOutdent:
          inChecklist &&
          roots.some((index) => canOutdentBlock(nextBlocks, index)),
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
      const [start, end] = ordered(anchor, focus);
      anchorRef.current = anchor;
      rangeRef.current = { start, end, focus };
      caretRef.current = focus;
      spanningRef.current = !collapsedRange(start, end);
      setPaint(spanningRef.current ? { start, end } : null);
      reportCaret(blocksRef.current, focus, true);
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
            offset: x < rect.left + rect.width / 2 ? 0 : blocksRef.current[index].text.length,
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
            element.textContent?.length ?? blocksRef.current[index].text.length,
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
            index === end.index ? end.offset : block.text.length,
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

    const applyText = (index: number, text: string, caret: DocCaret) => {
      const current = blocksRef.current;
      const block = current[index];
      const deleted = deleteSelection(
        current,
        { index, offset: 0 },
        { index, offset: block.text.length },
      );
      const inserted = insertText(deleted.blocks, deleted.caret, text);
      commit(inserted.blocks, caret);
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
      const encoded = encodeBody(decodeBody(body));
      if (encoded !== body) onChange(encoded);
    }, [body, onChange]);

    useLayoutEffect(() => {
      if (!restoreCaretRef.current) return;
      restoreCaretRef.current = false;
      const caret = caretRef.current;
      const element = blockNodesRef.current[caret.index];
      if (!element) return;
      const node = element.firstChild ?? element;
      const offset = node === element ? 0 : caret.offset;
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
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
    }));

    return (
      <div
        className="mt-quiet-focus min-h-11 flex-1 overflow-auto bg-[var(--mt-surface)] p-3 text-[var(--mt-text)]"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('[role="checkbox"]')) {
            return;
          }
          const caret = caretFromPoint(event.clientX, event.clientY);
          if (!caret) return;
          if (event.shiftKey) {
            applyRange(anchorRef.current, caret);
            dragAnchorRef.current = anchorRef.current;
          } else {
            applyRange(caret, caret);
            dragAnchorRef.current = caret;
          }
        }}
        onPointerMove={(event) => {
          const origin = dragAnchorRef.current;
          if (!origin || event.buttons === 0) return;
          const caret = caretFromPoint(event.clientX, event.clientY);
          if (!caret) return;
          if (caret.index === origin.index && caret.offset === origin.offset) {
            return;
          }
          event.preventDefault();
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.setPointerCapture(event.pointerId);
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
        {blocks.map((block, index) => (
          <div
            key={index}
            className={`flex min-h-11 items-start ${
              paint &&
              index >= paint.start.index &&
              index <= paint.end.index
                ? 'bg-[color-mix(in_srgb,var(--mt-accent)_28%,transparent)]'
                : ''
            }`}
            style={{
              paddingLeft:
                block.kind === 'item' ? block.indent * ITEM_INDENT_PX : 0,
            }}
          >
            {block.kind === 'item' && (
              <button
                type="button"
                role="checkbox"
                aria-checked={block.checked}
                aria-label={block.checked ? 'Mark unchecked' : 'Mark checked'}
                className="min-h-11 min-w-11 text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)]"
                disabled={disabled}
                onClick={() => {
                  if (composingRef.current) return;
                  rememberCurrent();
                  const next = toggleChecked(blocksRef.current, index);
                  commit(next, caretRef.current);
                }}
                onPointerDown={(event) => event.preventDefault()}
              >
                {block.checked ? (
                  <CheckSquare aria-hidden="true" />
                ) : (
                  <Square aria-hidden="true" />
                )}
              </button>
            )}
            <span
              ref={(element) => {
                blockNodesRef.current[index] = element;
              }}
              aria-label={index === 0 ? 'Note' : undefined}
              className={`min-h-11 min-w-0 flex-1 py-2 outline-none ${
                spanningRef.current ? 'select-none' : ''
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
              onCompositionEnd={() => {
                composingRef.current = false;
              }}
              onBeforeInput={(event) => {
                if (composingRef.current || disabled) return;
                const range = rangeRef.current;
                if (collapsedRange(range.start, range.end)) return;
                const native = event.nativeEvent;
                if (native.inputType === 'insertText' && native.data) {
                  event.preventDefault();
                  rememberCurrent();
                  const result = typeOverRange(
                    blocksRef.current,
                    range.start,
                    range.end,
                    native.data,
                  );
                  spanningRef.current = false;
                  setPaint(null);
                  commit(result.blocks, result.caret);
                  return;
                }
                if (native.inputType.startsWith('delete')) {
                  event.preventDefault();
                  rememberCurrent();
                  const result = deleteSelection(
                    blocksRef.current,
                    range.start,
                    range.end,
                  );
                  spanningRef.current = false;
                  setPaint(null);
                  commit(result.blocks, result.caret);
                }
              }}
              onInput={(event) => {
                if (dragAnchorRef.current || spanningRef.current) return;
                const input = event.nativeEvent as InputEvent;
                if (!input.isComposing && !typingRunRef.current) {
                  historyRef.current = remember(historyRef.current, snapshot());
                  typingRunRef.current = true;
                }
                const caret = editorSelection().focus;
                applyText(
                  index,
                  event.currentTarget.textContent ?? '',
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
                      offset: blocksRef.current[last].text.length,
                    },
                  );
                  return;
                }

                if (!ctrlOrMeta && CARET_MOVES.has(event.key)) {
                  event.preventDefault();
                  const focus = extendCaret(
                    blocksRef.current,
                    event.shiftKey ? range.focus : range.focus,
                    event.key as CaretMove,
                  );
                  applyRange(
                    event.shiftKey ? anchorRef.current : focus,
                    focus,
                  );
                  restoreCaretRef.current = true;
                  const element = blockNodesRef.current[focus.index];
                  if (element) {
                    const node = element.firstChild ?? element;
                    const offset = node === element ? 0 : focus.offset;
                    const nativeRange = document.createRange();
                    nativeRange.setStart(node, offset);
                    nativeRange.collapse(true);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(nativeRange);
                  }
                  return;
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
                  );
                  spanningRef.current = false;
                  setPaint(null);
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
                  spanningRef.current = false;
                  setPaint(null);
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
                  rememberCurrent();
                  const base = collapsed
                    ? { blocks: blocksRef.current, caret: range.focus }
                    : deleteSelection(
                        blocksRef.current,
                        range.start,
                        range.end,
                      );
                  const result = enterAt(base.blocks, base.caret);
                  commit(result.blocks, result.caret);
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
                event.preventDefault();
                writeClipboard(event, editorSelection());
              }}
              onCut={(event) => {
                event.preventDefault();
                if (composingRef.current) return;
                const range = editorSelection();
                writeClipboard(event, range);
                if (disabled) return;
                rememberCurrent();
                const result = deleteSelection(
                  blocksRef.current,
                  range.start,
                  range.end,
                );
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
              {block.text}
            </span>
          </div>
        ))}
      </div>
    );
  },
);
