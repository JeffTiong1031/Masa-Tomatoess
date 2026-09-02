import { buildCalendarSnapshot } from '@/lib/assistantContext';
import { askCalendarAssistant } from '@/lib/assistantRequest';
import {
  calendarChangeParser,
  categoryIdFor,
  clashesFor,
  describeChange,
  opWordFor,
  reconcileCalendarPlan,
  toEventInput,
  validateCalendarPlan,
  type CalendarChange,
} from '@/lib/calendarPlan';
import { deleteEvent, insertEvent, updateEvent, fetchEvents } from '@/lib/calendarRepo';
import { monthOf } from '@/lib/dates';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { withStepBudget, type AssistantSection } from './section';

export function calendarSection({
  categories,
  month,
}: {
  categories: Category[];
  month: string;
}): AssistantSection<CalendarChange, CalendarEvent> {
  const names = categories.map((category) => category.name);

  return {
    prefix: 'e',
    title: 'Ask about your calendar',
    placeholder: 'Move the dentist to Friday',
    fetchFailure: 'Could not reach your calendar. Nothing was changed.',

    async ask({ rows, map, today, now, history, owner }) {
      const built = buildCalendarSnapshot(rows, categories, owner, map, today, now);
      return { map: built.map, result: await askCalendarAssistant(built.snapshot, history) };
    },

    parser: (map, today) => calendarChangeParser(map, today, names),
    validatePlan: validateCalendarPlan,
    reconcile: reconcileCalendarPlan,
    clashTitles: (entry, rows) =>
      clashesFor(entry.change, rows, entry.id).map((row) => row.title),

    outsideNote(change) {
      if (change.op === 'delete' || change.date === '') return '';
      return monthOf(change.date) === month ? '' : "that's outside the month you're looking at";
    },

    opWord: opWordFor,
    describe: describeChange,

    fetchFresh: () => fetchEvents(),

    runChange({ change, id }, owner) {
      const categoryId = categoryIdFor(change.category, categories);
      return withStepBudget(
        (async () => {
          if (change.op === 'delete') {
            return (await deleteEvent(id as string)) ? 'saved' : 'failed';
          }
          const input = toEventInput(change, owner, categoryId);
          if (change.op === 'add') {
            return (await insertEvent(input)) ? 'saved' : 'failed';
          }
          return (await updateEvent(id as string, input)) ? 'saved' : 'failed';
        })(),
      );
    },
  };
}
