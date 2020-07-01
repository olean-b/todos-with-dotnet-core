<script>
import todoList from "./store";
let task = ''

async function handleSubmit(event) {
	event.preventDefault();

	const result = await fetch('/api/todo', {
		method:'POST',
		body: JSON.stringify({
			task: task
		}),
		headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
	})

	if (result.status === 200) {
		const todo = await result.json();
		todoList.addTodo(todo)
		task = ''
		return;
	}
}
</script>

<div class="p-2 w-full">
<form on:submit={handleSubmit}>
	<input bind:value={task} type="text" name="task" placeholder="What needs to be done?" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight text-2xl" />
</form>
</div>