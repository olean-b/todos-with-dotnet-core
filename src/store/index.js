import { writable } from 'svelte/store';

const TODOS = [];

const { subscribe, set, update } = writable(TODOS);

const fetch = async () => {

	update(data);
}

const addTodo = (todo) =>
	update((todo) => {
		return [...todos, todo];
	});

const reset = () => {
	set(TODOS);
};

export default {
	subscribe,
	addTodo,
	reset,
	fetch,
	set
};
