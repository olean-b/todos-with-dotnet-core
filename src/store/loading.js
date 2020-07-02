import { writable } from "svelte/store";

const initialState = "DONE";

const { subscribe, set } = writable(initialState);

export default {
  set,
  subscribe,
};
