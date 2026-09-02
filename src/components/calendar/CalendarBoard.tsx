'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import { occursOn, type CalendarEvent } from '@/lib/calendarEvent';
import { applyFilters, type OwnerFilter } from '@/lib/calendarViews';
import { groupByDate, searchEvents } from '@/lib/calendarSearch';
import {
  deleteCategory,
  deleteEvent,
  fetchCategories,
  fetchEvents,
  insertCategory,
  insertEvent,
  updateCategory,
  updateEvent,
} from '@/lib/calendarRepo';
import type { Category, SwatchIndex } from '@/lib/categories';
import { addDays, addMonths, monthOf, timeISO, todayISO } from '@/lib/dates';
import { toTiming, type EventDraft } from '@/lib/eventForm';
import { isUserName, type UserName } from '@/lib/identity';
import AssistantButton from '@/components/assistant/AssistantButton';
import { calendarSection } from '@/components/assistant/calendarSection';
import CategoryManager from './CategoryManager';
import DayPanel from './DayPanel';
import EventModal from './EventModal';
import FilterStrip from './FilterStrip';
import MonthGrid from './MonthGrid';
import SearchResults from './SearchResults';
import ViewSwitcher, { type CalendarView } from './ViewSwitcher';
import WeekRail from './WeekRail';
import YearGrid from './YearGrid';

function blankDraft(date: string): EventDraft {
  return {
    title: '',
    date,
    allDay: false,
    endDate: '',
    startTime: '',
    endTime: '',
    notes: '',
    countdown: false,
    categoryId: null,
  };
}

function draftOf(event: CalendarEvent): EventDraft {
  const { timing } = event;
  return {
    title: event.title,
    date: event.date,
    allDay: timing.kind === 'allDay',
    endDate: timing.kind === 'allDay' ? (timing.endDate ?? '') : '',
    startTime: timing.kind === 'allDay' ? '' : timing.startTime,
    endTime: timing.kind === 'span' ? timing.endTime : '',
    notes: event.notes ?? '',
    countdown: event.countdown,
    categoryId: event.categoryId,
  };
}

type ModalState =
  | { mode: 'add' }
  | { mode: 'edit'; event: CalendarEvent };

type NoticeTone = 'ok' | 'problem';

interface Notice {
  text: string;
  tone: NoticeTone;
}

export default function CalendarBoard() {
  const mounted = useHasMounted();

  const [signedInAs, setSignedInAs] = useState<UserName>('Jeff');
  const [view, setView] = useState<CalendarView>('week');
  const [owner, setOwner] = useState<OwnerFilter>('Jeff');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const [today, setToday] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [month, setMonth] = useState('');

  const [modal, setModal] = useState<ModalState | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('user_name');
    const name: UserName = isUserName(stored) ? stored : 'Jeff';
    const now = todayISO();
    queueMicrotask(() => {
      setSignedInAs(name);
      setOwner(name);
      setToday(now);
      setSelectedDate(now);
      setMonth(monthOf(now));
    });
  }, [mounted]);

  const load = useCallback(async () => {
    const [rows, cats] = await Promise.all([fetchEvents(), fetchCategories()]);
    if (rows === null || cats === null) {
      setFailed(true);
      return;
    }
    setEvents(rows);
    setCategories(cats);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
    });
  }, [mounted, load]);

  const visible = useMemo(
    () => applyFilters(events, { owner, categoryIds }),
    [events, owner, categoryIds],
  );

  const matches = useMemo(
    () => groupByDate(searchEvents(visible, query)),
    [visible, query],
  );

  const dayEvents = useMemo(
    () => visible.filter((event) => occursOn(event, selectedDate)),
    [visible, selectedDate],
  );

  const myEvents = useMemo(
    () => events.filter((event) => event.owner === signedInAs),
    [events, signedInAs],
  );

  const section = useMemo(() => calendarSection({ categories, month }), [categories, month]);

  const openAdd = () => {
    setDraft(blankDraft(selectedDate));
    setSaveError(null);
    setModal({ mode: 'add' });
  };

  const openEvent = (event: CalendarEvent) => {
    setDraft(draftOf(event));
    setSaveError(null);
    setModal({ mode: 'edit', event });
  };

  const closeModal = () => {
    setModal(null);
    setDraft(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (draft === null || modal === null) return;

    setIsSaving(true);
    setSaveError(null);

    const input = {
      owner: modal.mode === 'edit' ? modal.event.owner : signedInAs,
      title: draft.title.trim(),
      date: draft.date,
      timing: toTiming(draft),
      notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
      countdown: draft.countdown,
      categoryId: draft.categoryId,
    };

    const ok =
      modal.mode === 'add'
        ? await insertEvent(input)
        : await updateEvent(modal.event.id, input);

    setIsSaving(false);

    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }

    await load();
    closeModal();
  };

  const handleDelete = async () => {
    if (modal === null || modal.mode !== 'edit') return;
    setIsSaving(true);
    const ok = await deleteEvent(modal.event.id);
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not delete. Check your connection and try again.');
      return;
    }
    await load();
    closeModal();
  };

  const handleAddCategory = async (name: string, swatch: SwatchIndex) => {
    setIsSaving(true);
    await insertCategory(name, swatch, categories.length);
    setIsSaving(false);
    await load();
  };

  const handleRenameCategory = async (
    id: string,
    name: string,
    swatch: SwatchIndex,
  ) => {
    const previous = categories;
    setCategories((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
    const ok = await updateCategory(id, name, swatch);
    if (!ok) setCategories(previous);
  };

  const handleDeleteCategory = async (id: string) => {
    setIsSaving(true);
    await deleteCategory(id);
    setIsSaving(false);
    setCategoryIds((current) => current.filter((item) => item !== id));
    await load();
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

  const searching = query.trim() !== '';

  return (
    <div className="mb-4 flex flex-col gap-4">
      <ViewSwitcher
        view={view}
        query={query}
        onView={setView}
        onQuery={setQuery}
      />

      <FilterStrip
        owner={owner}
        categories={categories}
        categoryIds={categoryIds}
        onOwner={setOwner}
        onToggleCategory={(id) =>
          setCategoryIds((current) =>
            current.includes(id)
              ? current.filter((item) => item !== id)
              : [...current, id],
          )
        }
        onManage={() => setManagingCategories(true)}
      />

      {notice ? (
        <p
          role="status"
          className={`text-sm ${
            notice.tone === 'problem' ? 'text-[var(--mt-danger)]' : 'text-[var(--mt-text-muted)]'
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {searching ? (
        <Card>
          <SearchResults
            groups={matches}
            today={today}
            categories={categories}
            signedInAs={signedInAs}
            onOpen={openEvent}
          />
        </Card>
      ) : (
        <>
          <Card>
            {view === 'week' && (
              <WeekRail
                selectedDate={selectedDate}
                today={today}
                events={visible}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setMonth(monthOf(date));
                }}
                onWeek={(step) => {
                  const newDate = addDays(selectedDate, step * 7);
                  setSelectedDate(newDate);
                  setMonth(monthOf(newDate));
                }}
              />
            )}
            {view === 'month' && (
              <MonthGrid
                month={month}
                selectedDate={selectedDate}
                today={today}
                events={visible}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setMonth(monthOf(date));
                }}
                onMonth={(step) =>
                  setMonth((current) => addMonths(current, step))
                }
              />
            )}
            {view === 'year' && (
              <div className="min-w-0 overflow-x-auto">
                <YearGrid
                  year={Number(selectedDate.slice(0, 4))}
                  selectedDate={selectedDate}
                  today={today}
                  events={visible}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setMonth(monthOf(date));
                  }}
                />
              </div>
            )}
          </Card>

          <Card>
            <DayPanel
              date={selectedDate}
              events={dayEvents}
              categories={categories}
              signedInAs={signedInAs}
              onOpen={openEvent}
            />
          </Card>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            <Plus size={18} aria-hidden />
            Add event
          </button>
        </>
      )}

      {modal && draft && (
        <EventModal
          draft={draft}
          categories={categories}
          owner={modal.mode === 'edit' ? modal.event.owner : signedInAs}
          canEdit={modal.mode === 'add' || modal.event.owner === signedInAs}
          isEditing={modal.mode === 'edit'}
          isSaving={isSaving}
          saveError={saveError}
          onChange={setDraft}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}

      {managingCategories && (
        <CategoryManager
          categories={categories}
          events={events}
          isSaving={isSaving}
          onAdd={handleAddCategory}
          onRename={handleRenameCategory}
          onDelete={handleDeleteCategory}
          onClose={() => {
            setManagingCategories(false);
            load();
          }}
        />
      )}

      {owner === signedInAs && (
        <AssistantButton
          section={section}
          owner={signedInAs}
          rows={myEvents}
          clock={() => ({ today: todayISO(), now: timeISO() })}
          onApplied={(message, tone) => {
            setNotice({ text: message, tone });
            load();
          }}
        />
      )}
    </div>
  );
}
