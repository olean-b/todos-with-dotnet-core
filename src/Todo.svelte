<style>
  li:first-child {
    margin-top: 0;
  }
</style>

<script>
  import { http } from "./utils";
  import todoList from "./store";
  export let id;
  export let task;
  export let done;

  let active = false;

  function toggle() {
    active = !active;
  }

  async function handleDelete(event) {
    event.stopPropagation();
    const res = await http(`/api/todo/${id}`, "DELETE");

    if (res.status === 200) {
      todoList.deleteTodo(id);
      active = false;
    }
  }

  async function handleComplete(event) {
    event.stopPropagation();
    const res = await http(`/api/todo/${id}`, "PATCH", {
      id,
      task,
      done: !done
    })

    if (res.status === 200) {
      const todo = await res.json();
      todoList.updateTodo(todo)
      return
    }
    console.log('Noe gikk galt', res.statusText);
  }
</script>

<li
  on:click="{toggle}"
  class="text-2xl shadow rounded-md mt-2 flex flex-col cursor-pointer"
>
  <section class="p-4">
    <h3 class="{done ? 'line-through' : ''}">{task}</h3>
  </section>
  <footer class="bg-gray-100 flex justify-between {!active ? 'hidden' : ''}">
    <button class="{done ? 'text-blue-400' : 'text-green-400'} p-4 text-base font-bold focus:outline-none" on:click="{handleComplete}">
      {#if done}
      Undo
      {:else}
      Complete
      {/if}
    </button>
    <button class="text-red-400 p-4 text-base font-bold focus:outline-none" on:click="{handleDelete}">
      Delete
    </button>
  </footer>
</li>
