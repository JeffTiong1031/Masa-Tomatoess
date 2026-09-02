import { buildTodoSnapshot } from '@/lib/assistantContext';
import { askTodoAssistant } from '@/lib/assistantRequest';
import {
  clashesFor,
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

const OP_WORDS: Record<TodoChange['op'], string> = {
  add: 'Add',
  edit: 'Change',
  complete: 'Tick off',
  reopen: 'Reopen',
  delete: 'Delete',
};

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
  outsideNote: () => '',
  opWord: (change) => OP_WORDS[change.op],

  describe(change) {
    const parts = [change.title];
    if (change.dueDate !== '') parts.push(change.dueDate);
    if (change.dueTime !== '') parts.push(change.dueTime);
    if (change.priority) parts.push('priority');
    return parts.join(' · ');
  },

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
