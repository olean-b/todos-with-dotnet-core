import { todosStore } from './todos'

export async function readTodos() {
	const result = await fetch(`/api/todo`);
	const data = await result.json();
	console.log('data', data);
	todosStore.set(data)
}