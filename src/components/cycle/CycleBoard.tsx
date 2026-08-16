'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleDot, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import {
  SYMPTOMS,
  VALIDATION_MESSAGES,
  summarizeCycle,
  validateEnd,
  validateStart,
  type PeriodLog,
} from '@/lib/cycle';
import {
  buildCalendarMonth,
  historyRows,
} from '@/lib/cycleCalendar';
import { addMonths, monthOf, todayISO } from '@/lib/cycleDates';
import {
  deletePeriod,
  fetchPeriods,
  fetchSymptoms,
  insertPeriod,
  saveSymptoms,
  updatePeriod,
} from '@/lib/cycleRepo';
import CycleCalendar from './CycleCalendar';
import CycleRing from './CycleRing';
import LogPeriodModal from './LogPeriodModal';
import PeriodHistory from './PeriodHistory';
import SymptomChips from './SymptomChips';

type View = 'ring' | 'calendar';

const VIEW_KEY = 'cycle_view';

type ModalState =
  | { mode: 'start'; editingId: null; initialDate: string; initialEndDate: null }
  | { mode: 'end'; editingId: string; initialDate: string; initialEndDate: string }
  | { mode: 'edit'; editingId: string; initialDate: string; initialEndDate: string | null };

export default function CycleBoard() {
  const mounted = useHasMounted();
  const today = mounted ? todayISO() : '';

  const [view, setView] = useState<View>('ring');
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [month, setMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [symptoms, setSymptoms] = useState<Record<string, string[]>>({});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem(VIEW_KEY);
    queueMicrotask(() => {
      if (stored === 'ring' || stored === 'calendar') setView(stored);
      setMonth(monthOf(todayISO()));
      setSelectedDate(todayISO());
    });
  }, [mounted]);

  const load = useCallback(async () => {
    const rows = await fetchPeriods();
    if (rows === null) {
      setFailed(true);
      return;
    }
    setLogs(rows);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
    });
  }, [mounted, load]);

  useEffect(() => {
    if (month === '') return;
    (async () => {
      const from = `${addMonths(month, -1)}-01`;
      const to = `${addMonths(month, 1)}-28`;
      const rows = await fetchSymptoms(from, to);
      if (rows) setSymptoms((current) => ({ ...current, ...rows }));
    })();
  }, [month]);

  const chooseView = (next: View) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const summary = useMemo(() => summarizeCycle(logs, today), [logs, today]);

  const symptomDates = useMemo(
    () =>
      new Set(
        Object.entries(symptoms)
          .filter(([, list]) => list.length > 0)
          .map(([date]) => date),
      ),
    [symptoms],
  );

  const days = useMemo(
    () =>
      month === ''
        ? []
        : buildCalendarMonth({
            month,
            logs,
            today,
            symptomDates,
          }),
    [month, logs, today, symptomDates],
  );

  const rows = useMemo(() => historyRows(logs), [logs]);
  const openPeriod = rows.find((row) => row.endDate === null) ?? null;

  const closeModal = () => {
    setModal(null);
    setSaveError(null);
  };

  const handleSave = async (
    state: ModalState,
    date: string,
    endDate: string | null,
  ) => {
    const startError = validateStart(date, logs, today, state.editingId);
    if (startError) {
      setSaveError(VALIDATION_MESSAGES[startError]);
      return;
    }
    if (endDate !== null) {
      const endError = validateEnd(endDate, date, today);
      if (endError) {
        setSaveError(VALIDATION_MESSAGES[endError]);
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);

    const ok =
      state.editingId === null
        ? await insertPeriod(date)
        : await updatePeriod(state.editingId, date, endDate);

    setIsSaving(false);

    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }

    await load();
    closeModal();
  };

  const handleDelete = async (editingId: string) => {
    setIsSaving(true);
    const ok = await deletePeriod(editingId);
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not delete. Check your connection and try again.');
      return;
    }
    await load();
    closeModal();
  };

  const toggleSymptom = async (symptom: string) => {
    const current = symptoms[selectedDate] ?? [];
    const next = current.includes(symptom)
      ? current.filter((item) => item !== symptom)
      : [...current, symptom].sort(
          (a, b) =>
            SYMPTOMS.findIndex((item) => item === a) -
            SYMPTOMS.findIndex((item) => item === b),
        );

    setSymptoms((all) => ({ ...all, [selectedDate]: next }));
    const ok = await saveSymptoms(selectedDate, next);
    if (!ok) setSymptoms((all) => ({ ...all, [selectedDate]: current }));
  };

  if (!mounted || (!loaded && !failed)) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      </Card>
    );
  }

  if (failed) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text)]">Could not load.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            load();
          }}
          className="mt-3 min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Try again
        </button>
      </Card>
    );
  }

  const primaryLabel = openPeriod ? 'My period stopped' : 'I got my period';

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {(
          [
            { key: 'ring', label: 'Now', icon: CircleDot },
            { key: 'calendar', label: 'Month', icon: CalendarDays },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => chooseView(key)}
            aria-pressed={view === key}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full text-xs font-semibold ${
              view === key ? '' : 'text-[var(--mt-text-muted)]'
            }`}
            style={
              view === key
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <Card>
        {summary.dayOfCycle === null ||
        summary.phase === null ||
        summary.nextStart === null ? (
          <div className="py-6 text-center">
            <p className="text-base font-medium text-[var(--mt-text)]">
              Tell me when your last period started
            </p>
            <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
              Everything else follows from that one date.
            </p>
          </div>
        ) : view === 'ring' ? (
          <CycleRing
            cycleLength={summary.cycleLength}
            periodLength={summary.periodLength}
            dayOfCycle={summary.dayOfCycle}
            phase={summary.phase}
            headline={summary.headline}
            nextStart={summary.nextStart}
            confidence={summary.confidence}
          />
        ) : (
          <CycleCalendar
            month={month}
            days={days}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onMonth={(step) => setMonth((current) => addMonths(current, step))}
          />
        )}
      </Card>

      <button
        type="button"
        onClick={() =>
          setModal(
            openPeriod
              ? {
                  mode: 'end',
                  editingId: openPeriod.id,
                  initialDate: openPeriod.startDate,
                  initialEndDate: today,
                }
              : {
                  mode: 'start',
                  editingId: null,
                  initialDate: today,
                  initialEndDate: null,
                },
          )
        }
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
      >
        <Plus size={18} aria-hidden />
        {primaryLabel}
      </button>

      <Card>
        <SymptomChips
          date={view === 'calendar' ? selectedDate : today}
          selected={symptoms[view === 'calendar' ? selectedDate : today] ?? []}
          onToggle={toggleSymptom}
        />
      </Card>

      <Card>
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
          History
        </div>
        <PeriodHistory
          rows={rows}
          onEdit={(id) => {
            const row = rows.find((entry) => entry.id === id)!;
            setModal({
              mode: 'edit',
              editingId: row.id,
              initialDate: row.startDate,
              initialEndDate: row.endDate,
            });
          }}
        />
      </Card>

      <p className="px-1 text-xs text-[var(--mt-text-subtle)]">
        These are estimates worked out from dates alone. Not a way to avoid or
        plan a pregnancy, and not medical advice.
      </p>

      {modal && (
        <LogPeriodModal
          mode={modal.mode}
          today={today}
          initialDate={modal.initialDate}
          initialEndDate={modal.initialEndDate}
          error={saveError}
          isSaving={isSaving}
          onClose={closeModal}
          onSave={(date, endDate) => handleSave(modal, date, endDate)}
          onDelete={modal.mode === 'edit' ? () => handleDelete(modal.editingId) : undefined}
        />
      )}
    </div>
  );
}
