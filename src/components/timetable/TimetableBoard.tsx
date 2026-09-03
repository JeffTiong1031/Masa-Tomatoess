'use client';

import { useCallback, useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { todayWeekday } from '@/lib/dates';
import { isUserName, USERS, type UserName } from '@/lib/identity';
import { gridHours, rulesByWeekday } from '@/lib/timetableGrid';
import {
  deleteRule,
  deleteRulesOf,
  fetchRules,
  insertRule,
  updateRule,
} from '@/lib/timetableRepo';
import type { RuleDraft, TimetableRule } from '@/lib/timetableRule';
import { useHasMounted } from '@/hooks/useHasMounted';
import RecurringList from './RecurringList';
import RuleModal from './RuleModal';
import TimetableGrid from './TimetableGrid';

type Editing = { rule: TimetableRule | null } | null;

export default function TimetableBoard() {
  const mounted = useHasMounted();
  const stored = mounted ? localStorage.getItem('user_name') : null;
  const me = isUserName(stored) ? stored : null;

  const [shown, setShown] = useState<UserName | null>(me);
  const [rules, setRules] = useState<TimetableRule[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const loaded = await fetchRules();
    if (loaded === null) {
      setFailed(true);
      return;
    }
    setRules(loaded);
  }, []);

  useEffect(() => {
    if (me === null) return;
    (async () => {
      await load();
    })();
  }, [me, load]);

  if (me === null || shown === null) return null;

  const isMine = shown === me;
  const visible = (rules ?? []).filter((rule) => rule.owner === shown);
  const hours = gridHours(visible);

  const commit = async (run: () => Promise<boolean>) => {
    setIsSaving(true);
    setSaveError(null);
    const ok = await run();
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }
    setEditing(null);
    await load();
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-full border border-[var(--mt-border)]">
          {USERS.map((user) => (
            <button
              key={user}
              type="button"
              onClick={() => setShown(user)}
              aria-pressed={shown === user}
              className={`min-h-11 px-4 text-sm ${
                shown === user
                  ? 'bg-[var(--mt-text)] font-semibold text-[var(--mt-surface)]'
                  : 'text-[var(--mt-text-muted)]'
              }`}
            >
              {user === me ? 'Me' : user}
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-4">
        {failed ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--mt-danger)]" role="alert">
              Couldn&apos;t load the timetable.
            </p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setRules(null);
                load();
              }}
              className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
            >
              Retry
            </button>
          </div>
        ) : rules === null ? (
          <div className="h-40 rounded-xl bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]" aria-busy>
            <span className="sr-only">Loading the timetable</span>
          </div>
        ) : (
          <TimetableGrid
            days={rulesByWeekday(visible)}
            hours={hours}
            today={todayWeekday()}
            onPick={(rule) => isMine && setEditing({ rule })}
          />
        )}
      </Card>

      {rules !== null && !failed && (
        <RecurringList
          rules={visible}
          isMine={isMine}
          onAdd={() => {
            setSaveError(null);
            setEditing({ rule: null });
          }}
          onEdit={(rule) => {
            setSaveError(null);
            setEditing({ rule });
          }}
          onClearAll={() => {
            if (!confirm(`Delete all ${visible.length} recurring events? This cannot be undone.`)) return;
            commit(() => deleteRulesOf(shown));
          }}
        />
      )}

      {editing !== null && (
        <RuleModal
          open
          owner={shown}
          editing={editing.rule}
          rules={rules ?? []}
          isSaving={isSaving}
          error={saveError}
          onClose={() => setEditing(null)}
          onSave={(draft: RuleDraft) =>
            commit(() =>
              editing.rule === null
                ? insertRule(shown, draft)
                : updateRule(editing.rule.id, draft),
            )
          }
          onDelete={(id) => commit(() => deleteRule(id))}
        />
      )}
    </>
  );
}
