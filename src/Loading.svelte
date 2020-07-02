<script>
	import loadingState from "./store/loading";
</script>

{#if $loadingState === 'LOADING'}
  <div class="flex justify-center text-3xl text-gray-600 items-center min-h-screen">Loading...</div>
{:else}
  <slot />
{/if}
