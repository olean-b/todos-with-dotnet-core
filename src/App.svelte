<script>
  import { onMount } from "svelte";
  import todoList from "./store";
  import Todo from "./Todo.svelte";
  import AddTodo from "./AddTodo.svelte"
  onMount(async () => {
    const result = await fetch("/api/todo");
    const data = await result.json();

    todoList.set(data);
  });
</script>

<div class="min-h-screen container max-w-xl mx-auto">
  <header class="p-4 flex justify-center">
    <h1 class="title text-gray-800 text-4xl">TODOS!</h1>
  </header>

  <AddTodo />
  <ul class="p-2">
    {#each $todoList as todo}
      <Todo {...todo} />
    {/each}
  </ul>
</div>
