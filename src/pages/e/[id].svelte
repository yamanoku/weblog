<script>
  let { entry } = $props();
</script>

{#if entry}
  <article>
    <h1>{entry.title}</h1>
    <p>{entry.body}</p>
  </article>
{:else}
  <p>No entry for this URL.</p>
{/if}
