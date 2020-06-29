<script>
import { onMount } from 'svelte'
  import todos from './store'

  onMount(async () => {
    const result = await fetch('/api/todo');
	  const data = await result.json();

    todos.set(data);
  })
</script>

<div class="bg-red-500">
  <ul>
  {#each $todos as todo}
    <li>{todo.task}</li>
  {/each}
  </ul>
</div>