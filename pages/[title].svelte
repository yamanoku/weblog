<script>
  let { entry } = $props();
</script>

{#if entry}
  <article>
    <h1>{entry.title}</h1>
    <p>{entry.body}</p>
  </article>
{:else}
  <p>Empty page</p>
{/if}
