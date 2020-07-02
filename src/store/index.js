import { writable } from "svelte/store";

const initialState = [];

const { subscribe, set, update } = writable(initialState);

const addTodo = (todo) => update((todos) => [todo, ...todos]);

const deleteTodo = (id) => update((todos) => todos.filter((t) => t.id !== id));

const updateTodo = (todo) =>
  update((todos) => {
    return todos.map((t) => {
      if (t.id === todo.id) {
        return todo;
      }

      return t;
    });
  });
const reset = () => {
  set(TODOS);
};

export default {
  updateTodo,
  deleteTodo,
  subscribe,
  addTodo,
  reset,
  fetch,
  set,
};
