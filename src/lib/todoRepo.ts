import { supabase } from './supabase';
import type { UserName } from './identity';
import type { Todo, TodoDraft } from './todo';

interface TodoRow {
  id: string;
  owner: UserName;
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: boolean;
  completed_at: string | null;
  created_at: string;
}

export type TodoFetch =
  | { status: 'ok'; rows: Todo[] }
  | { status: 'missing-table' }
  | { status: 'error' };

const COLUMNS = 'id, owner, title, due_date, due_time, priority, completed_at, created_at';

const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

function toTodo(row: TodoRow): Todo {
  const base = {
    id: row.id,
    owner: row.owner,
    title: row.title,
    dueDate: row.due_date,
    dueTime: row.due_time === null ? null : row.due_time.slice(0, 5),
    priority: row.priority,
    createdAt: row.created_at,
  };
  return row.completed_at === null
    ? { ...base, done: false, completedAt: null }
    : { ...base, done: true, completedAt: row.completed_at };
}

function toRow(draft: TodoDraft) {
  return {
    owner: draft.owner,
    title: draft.title.trim(),
    due_date: draft.dueDate,
    due_time: draft.dueTime,
    priority: draft.priority,
  };
}

export async function fetchTodos(owner: UserName): Promise<TodoFetch> {
  const { data, error } = await supabase
    .from('todos')
    .select(COLUMNS)
    .eq('owner', owner)
    .order('created_at', { ascending: true });

  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code)) return { status: 'missing-table' };
    console.error('Failed to load todos:', error);
    return { status: 'error' };
  }

  return { status: 'ok', rows: (data as TodoRow[]).map(toTodo) };
}

export async function insertTodo(draft: TodoDraft): Promise<Todo | null> {
  const { data, error } = await supabase
    .from('todos')
    .insert(toRow(draft))
    .select(COLUMNS)
    .single();

  if (error) {
    console.error('Failed to add a todo:', error);
    return null;
  }

  return toTodo(data as TodoRow);
}

export async function setTodoDone(id: string, done: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('todos')
    .update({
      done,
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to change a todo:', error);
    return false;
  }
  return true;
}

export async function updateTodo(id: string, fields: TodoDraft): Promise<boolean> {
  const { error } = await supabase
    .from('todos')
    .update({ ...toRow(fields), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to edit a todo:', error);
    return false;
  }
  return true;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const { error } = await supabase.from('todos').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete a todo:', error);
    return false;
  }
  return true;
}
