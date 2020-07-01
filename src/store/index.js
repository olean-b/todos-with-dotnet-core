import { writable } from "svelte/store";

const TODOS = [];

const { subscribe, set, update } = writable(TODOS);

const addTodo = (todo) => update((todos) => [todo, ...todos]);

const deleteTodo = (id) => update((todos) => todos.filter((t) => t.id !== id));

const reset = () => {
  set(TODOS);
};

export default {
  deleteTodo,
  subscribe,
  addTodo,
  reset,
  fetch,
  set,
};
