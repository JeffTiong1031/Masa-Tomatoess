'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { CheckSquare, Square } from 'lucide-react';
import {
  canIndent as canIndentBlock,
  canOutdent as canOutdentBlock,
  deleteSelection,
  indentSelection,
  insertText,
  outdentSelection,
  toggleChecked,
  toggleChecklist,
  type DocCaret,
} from '@/lib/noteEdit';
import { decodeBody, encodeBody, type Block } from '@/lib/noteDoc';

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

export const NotesEditor = forwardRef<NotesEditorHandle, NotesEditorProps>(
  function NotesEditor({ body, disabled = false, onChange, onCaret }, ref) {
    const [blocks, setBlocks] = useState<Block[]>(() => decodeBody(body));
    const blocksRef = useRef(blocks);
    const caretRef = useRef<DocCaret>({ index: 0, offset: 0 });
    const focusedRef = useRef(false);

    const reportCaret = (
      nextBlocks: Block[],
      caret: DocCaret,
      inWords = focusedRef.current,
    ) => {
      const block = nextBlocks[caret.index];
      const inChecklist = inWords && block.kind === 'item';
      onCaret({
        inWords,
        inChecklist,
        canIndent: inChecklist && canIndentBlock(nextBlocks, caret.index),
        canOutdent: inChecklist && canOutdentBlock(nextBlocks, caret.index),
      });
    };

    const commit = (nextBlocks: Block[], caret: DocCaret) => {
      blocksRef.current = nextBlocks;
      caretRef.current = caret;
      setBlocks(nextBlocks);
      onChange(encodeBody(nextBlocks));
      reportCaret(nextBlocks, caret);
    };

    const applyText = (index: number, text: string) => {
      const current = blocksRef.current;
      const block = current[index];
      const deleted = deleteSelection(
        current,
        { index, offset: 0 },
        { index, offset: block.text.length },
      );
      const inserted = insertText(deleted.blocks, deleted.caret, text);
      commit(inserted.blocks, inserted.caret);
    };

    const updateCaret = (index: number) => {
      const selection = document.getSelection();
      const offset = Math.min(
        selection?.focusOffset ?? caretRef.current.offset,
        blocksRef.current[index].text.length,
      );
      const caret = { index, offset };
      caretRef.current = caret;
      reportCaret(blocksRef.current, caret, true);
    };

    useEffect(() => {
      const encoded = encodeBody(decodeBody(body));
      if (encoded !== body) onChange(encoded);
    }, [body, onChange]);

    useImperativeHandle(ref, () => ({
      toggle() {
        const current = blocksRef.current;
        const caret = caretRef.current;
        const result = toggleChecklist(
          current,
          caret.index,
          caret.index,
          caret,
        );
        commit(result.blocks, result.caret);
      },
      indent() {
        const current = blocksRef.current;
        const caret = caretRef.current;
        const result = indentSelection(
          current,
          caret.index,
          caret.index,
          caret,
        );
        commit(result.blocks, result.caret);
      },
      outdent() {
        const current = blocksRef.current;
        const caret = caretRef.current;
        const result = outdentSelection(
          current,
          caret.index,
          caret.index,
          caret,
        );
        commit(result.blocks, result.caret);
      },
    }));

    return (
      <div
        className="mt-quiet-focus min-h-11 flex-1 overflow-auto bg-[var(--mt-surface)] p-3 text-[var(--mt-text)]"
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
            className="flex min-h-11 items-start"
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
              aria-label={index === 0 ? 'Note' : undefined}
              className={`min-h-11 min-w-0 flex-1 py-2 outline-none ${
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
              onInput={(event) =>
                applyText(index, event.currentTarget.textContent ?? '')
              }
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
