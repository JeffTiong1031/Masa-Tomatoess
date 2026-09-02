import { buildTodoSnapshot } from '@/lib/assistantContext';
import { askTodoAssistant } from '@/lib/assistantRequest';
import {
  clashesFor,
  clashNoteFor,
  describeChange,
  opWordFor,
  reconcileTodoPlan,
  toDraft,
  todoChangeParser,
  validateTodoPlan,
  type TodoChange,
} from '@/lib/todoPlan';
import {
  deleteTodo,
  fetchTodos,
  insertTodo,
  setTodoDone,
  updateTodo,
} from '@/lib/todoRepo';
import type { Todo } from '@/lib/todo';
import { withStepBudget, type AssistantSection } from './section';

export const todoSection: AssistantSection<TodoChange, Todo> = {
  prefix: 't',
  title: 'Ask about your list',
  placeholder: 'Move dentist to Friday',
  fetchFailure: 'Could not reach your list. Nothing was changed.',

  async ask({ rows, map, today, now, history }) {
    const built = buildTodoSnapshot(rows, map, today, now);
    return { map: built.map, result: await askTodoAssistant(built.snapshot, history) };
  },

  parser: (map, today) => todoChangeParser(map, today),
  validatePlan: validateTodoPlan,
  reconcile: reconcileTodoPlan,
  clashTitles: (entry, rows) =>
    clashesFor(entry.change, rows, entry.id).map((row) => row.title),
  clashNote: clashNoteFor,
  outsideNote: () => '',
  opWord: opWordFor,
  describe: describeChange,

  async fetchFresh(owner) {
    const fresh = await fetchTodos(owner);
    return fresh.status === 'ok' ? fresh.rows : null;
  },

  runChange({ change, id }, owner) {
    return withStepBudget(
      (async () => {
        if (change.op === 'add') {
          return (await insertTodo(toDraft(change, owner))) === null ? 'failed' : 'saved';
        }
        if (change.op === 'edit') {
          return (await updateTodo(id as string, toDraft(change, owner))) ? 'saved' : 'failed';
        }
        if (change.op === 'delete') {
          return (await deleteTodo(id as string)) ? 'saved' : 'failed';
        }
        return (await setTodoDone(id as string, change.op === 'complete')) ? 'saved' : 'failed';
      })(),
    );
  },
};
