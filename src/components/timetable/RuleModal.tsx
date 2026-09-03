'use client';

import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import ColourWheel from '@/components/colour/ColourWheel';
import SwatchAddSheet from '@/components/colour/SwatchAddSheet';
import TextScopeDialog from '@/components/colour/TextScopeDialog';
import Modal from '@/components/ui/Modal';
import {
  STARTER_FILLS,
  applyTextUpdateAll,
  canDeleteSwatch,
  resolveTimetablePaint,
  type ColourSwatch,
} from '@/lib/colourPalette';
import { deleteSwatch, insertSwatch, updateSwatch } from '@/lib/colourRepo';
import { WEEKDAYS, type Weekday } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import { updateRule } from '@/lib/timetableRepo';
import {
  ruleMessage,
  validateRule,
  type RuleDraft,
  type TimetableRule,
} from '@/lib/timetableRule';

const FIELD =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]';

const DEFAULT_TEXT = '#FFFFFF';

function selectedSwatch(swatches: ColourSwatch[], swatchId: string) {
  return swatches.find((item) => item.id === swatchId);
}

function appliedText(swatch: ColourSwatch | undefined, textOverride: string | null) {
  if (swatch === undefined) return DEFAULT_TEXT;
  return resolveTimetablePaint(swatch, textOverride).text;
}

export default function RuleModal({
  open,
  owner,
  editing,
  rules,
  swatches,
  isMine,
  isSaving,
  error,
  onClose,
  onSave,
  onDelete,
  onSwatchesChange,
  onRefresh,
}: {
  open: boolean;
  owner: UserName;
  editing: TimetableRule | null;
  rules: TimetableRule[];
  swatches: ColourSwatch[];
  isMine: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: RuleDraft) => void;
  onDelete: (id: string) => void;
  onSwatchesChange: (swatches: ColourSwatch[]) => void;
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<RuleDraft>(() =>
    editing === null
      ? {
          weekday: 0,
          title: '',
          startTime: '09:00',
          endTime: '10:00',
          swatchId: swatches[0]?.id ?? '',
          textOverride: null,
        }
      : {
          weekday: editing.weekday,
          title: editing.title,
          startTime: editing.startTime,
          endTime: editing.endTime,
          swatchId: editing.swatchId,
          textOverride: editing.textOverride,
        },
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [textPick, setTextPick] = useState(() =>
    appliedText(selectedSwatch(swatches, draft.swatchId), draft.textOverride),
  );
  const textPickRef = useRef(textPick);

  const setPick = (hex: string) => {
    textPickRef.current = hex;
    setTextPick(hex);
  };

  const current = selectedSwatch(swatches, draft.swatchId);
  const preview = current === undefined
    ? { fill: 'var(--mt-surface)', text: 'var(--mt-text)' }
    : { fill: current.fill, text: textPick };

  const patch = (next: Partial<RuleDraft>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...next }));
    setProblem(null);
  };

  const pickSwatch = (id: string) => {
    if (!isMine) return;
    const next = selectedSwatch(swatches, id);
    patch({ swatchId: id, textOverride: null });
    setPick(next?.textColor ?? DEFAULT_TEXT);
    setScopeOpen(false);
  };

  const onTextChange = (hex: string) => {
    setPick(hex);
    if (editing === null) {
      const swatch = selectedSwatch(swatches, draft.swatchId);
      if (swatch === undefined) return;
      patch({
        textOverride: hex === (swatch.textColor ?? DEFAULT_TEXT) ? null : hex,
      });
    }
  };

  const finishTextPointer = () => {
    if (!isMine || editing === null) return;
    const swatch = selectedSwatch(swatches, draft.swatchId);
    if (swatch === undefined) return;
    const currentText = appliedText(swatch, draft.textOverride);
    if (textPickRef.current === currentText) return;
    setScopeOpen(true);
  };

  const closeScope = () => {
    const swatch = selectedSwatch(swatches, draft.swatchId);
    setPick(appliedText(swatch, draft.textOverride));
    setScopeOpen(false);
  };

  const justThis = () => {
    const swatch = selectedSwatch(swatches, draft.swatchId);
    if (swatch === undefined) return;
    const picked = textPickRef.current;
    patch({
      textOverride:
        picked === (swatch.textColor ?? DEFAULT_TEXT) ? null : picked,
    });
    setScopeOpen(false);
  };

  const updateAll = async () => {
    const swatch = selectedSwatch(swatches, draft.swatchId);
    if (swatch === undefined) return;
    const { swatch: next, rulePatches } = applyTextUpdateAll(
      swatch,
      textPickRef.current,
      rules,
    );
    const saved = await updateSwatch(next.id, { textColor: next.textColor });
    if (!saved) {
      setProblem('Could not update the colour. Check your connection and try again.');
      setScopeOpen(false);
      return;
    }
    for (const item of rulePatches) {
      const rule = rules.find((entry) => entry.id === item.id);
      if (rule === undefined) continue;
      const ok = await updateRule(rule.id, {
        weekday: rule.weekday,
        title: rule.title,
        startTime: rule.startTime,
        endTime: rule.endTime,
        swatchId: rule.swatchId,
        textOverride: null,
      });
      if (!ok) {
        setProblem('Could not update the colour. Check your connection and try again.');
        setScopeOpen(false);
        return;
      }
    }
    onSwatchesChange(
      swatches.map((item) => (item.id === next.id ? next : item)),
    );
    patch({ textOverride: null });
    setScopeOpen(false);
    await onRefresh();
  };

  const addColour = async (fill: string, textColor: string | null) => {
    const created = await insertSwatch(owner, 'timetable', fill, textColor);
    if (created === null) {
      setProblem('Could not add a colour. Check your connection and try again.');
      return;
    }
    onSwatchesChange([...swatches, created]);
    patch({ swatchId: created.id, textOverride: null });
    setPick(created.textColor ?? DEFAULT_TEXT);
    setAddOpen(false);
  };

  const removeColour = async () => {
    if (!isMine || draft.swatchId === '') return;
    if (!canDeleteSwatch(draft.swatchId, rules.map((rule) => rule.swatchId))) {
      const used = rules.filter((rule) => rule.swatchId === draft.swatchId).length;
      alert(
        used === 1
          ? 'This colour is still used by 1 recurring event.'
          : `This colour is still used by ${used} recurring events.`,
      );
      return;
    }
    const ok = await deleteSwatch(draft.swatchId);
    if (!ok) {
      setProblem('Could not delete the colour. Check your connection and try again.');
      return;
    }
    const remaining = swatches.filter((item) => item.id !== draft.swatchId);
    onSwatchesChange(remaining);
    const next = remaining[0];
    patch({
      swatchId: next?.id ?? '',
      textOverride: null,
    });
    setPick(next?.textColor ?? DEFAULT_TEXT);
  };

  const submit = () => {
    const found = validateRule(draft, owner, rules, editing?.id ?? null);
    if (found !== null) {
      setProblem(ruleMessage(found, draft.weekday));
      return;
    }
    onSave(draft);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editing === null ? 'Add recurring event' : 'Edit recurring event'}
        variant="sheet"
      >
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
            Day
            <select
              value={draft.weekday}
              onChange={(e) => patch({ weekday: Number(e.target.value) as Weekday })}
              className={`mt-1 ${FIELD}`}
            >
              {WEEKDAYS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
              Starts
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => patch({ startTime: e.target.value })}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
              Ends
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => patch({ endTime: e.target.value })}
                className={`mt-1 ${FIELD}`}
              />
            </label>
          </div>

          <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
            Name
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Data Structures"
              className={`mt-1 ${FIELD}`}
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-[var(--mt-text-muted)]">
              Colour
            </legend>
            <div className="flex flex-wrap gap-2">
              {swatches.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  aria-label="Colour"
                  aria-pressed={draft.swatchId === swatch.id}
                  disabled={!isMine}
                  onClick={() => pickSwatch(swatch.id)}
                  className={`h-11 w-11 rounded-xl disabled:cursor-default ${
                    draft.swatchId === swatch.id
                      ? 'ring-2 ring-[var(--mt-text)] ring-offset-2 ring-offset-[var(--mt-surface)]'
                      : ''
                  }`}
                  style={{ background: swatch.fill }}
                />
              ))}
              {isMine && (
                <button
                  type="button"
                  aria-label="Add colour"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[var(--mt-border)] text-[var(--mt-text-muted)]"
                >
                  <Plus size={20} aria-hidden />
                </button>
              )}
            </div>
            {isMine && draft.swatchId !== '' && (
              <button
                type="button"
                onClick={removeColour}
                className="mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)]"
              >
                Delete colour
              </button>
            )}
          </fieldset>

          {current !== undefined && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: preview.fill, color: preview.text }}
            >
              <p className="text-sm font-semibold">
                {draft.title.trim() === '' ? 'Class name' : draft.title}
              </p>
              <p className="mt-1 text-sm">
                {draft.startTime}–{draft.endTime}
              </p>
            </div>
          )}

          {isMine && current !== undefined && (
            <div className="flex flex-col gap-2" onPointerUp={finishTextPointer}>
              <p className="text-xs font-semibold text-[var(--mt-text-muted)]">
                Text
              </p>
              <ColourWheel value={textPick} onChange={onTextChange} />
            </div>
          )}

          {(problem ?? error) !== null && (
            <p className="text-sm text-[var(--mt-danger)]" role="alert">
              {problem ?? error}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {editing !== null && (
              <button
                type="button"
                onClick={() => onDelete(editing.id)}
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)]"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSaving}
              className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <SwatchAddSheet
        open={addOpen}
        kind="timetable"
        title={draft.title.trim() === '' ? 'Class name' : draft.title}
        timeLabel={`${draft.startTime}–${draft.endTime}`}
        initialFill={STARTER_FILLS[0]}
        initialText={DEFAULT_TEXT}
        onClose={() => setAddOpen(false)}
        onConfirm={addColour}
      />

      <TextScopeDialog
        open={scopeOpen}
        onClose={closeScope}
        onJustThis={justThis}
        onUpdateAll={() => {
          void updateAll();
        }}
      />
    </>
  );
}
