<style>
  li:first-child {
    margin-top: 0;
  }
</style>

<script>
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
    const res = await fetch(`/api/todo/${id}`, {
      method: "DELETE"
    });

    if (res.status === 200) {
      todoList.deleteTodo(id);
      active = false;
    }
  }
</script>

<li
  on:click="{toggle}"
  class="text-2xl shadow rounded-md mt-2 flex flex-col cursor-pointer"
>
  <section class="p-4">{task}</section>
  <footer class="bg-gray-100 flex justify-end {!active ? 'hidden' : ''}">
    <button class="text-red-400 p-4 text-base" on:click="{handleDelete}">
      Delete
    </button>
  </footer>
</li>
