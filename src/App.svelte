<script>
  import { onMount } from "svelte";
  import store from "./store";
  import Todo from "./Todo.svelte";
  import AddTodo from "./AddTodo.svelte";
  import { http } from "./utils";
  import App from "./Loading.svelte";
  import AppState from "./store/loading";

  onMount(async () => {
    AppState.set("LOADING");
    setTimeout(async () => {
      const result = await http("/api/todo");
      const data = await result.json();
      if (result.status === 200) {
        store.set(data);
      }
      AppState.set("DONE");
    }, 1000)
  });
</script>

<div class="min-h-screen container max-w-xl mx-auto">
  <App>
    <header class="p-4 flex justify-center">
      <h1 class="title text-gray-800 text-4xl">TODOS!</h1>
    </header>

    <AddTodo />
    <ul class="p-2">
      {#each $store as todo}
        <Todo {...todo} />
      {/each}
    </ul>
  </App>
</div>
