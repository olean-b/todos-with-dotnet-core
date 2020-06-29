import { createEntityQuery } from '@datorama/akita';
import { todosStore } from './todos';

export const todosQuery = createEntityQuery(todosStore);
export const todos = todosQuery.getAll();