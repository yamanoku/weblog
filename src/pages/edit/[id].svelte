<script>
  let { entry } = $props();
</script>

{#if entry}
  <h1>Edit {entry.title}</h1>
  <form method="post">
    <label>
      Title
      <input name="title" value={entry.title} />
    </label>
    <label>
      Body
      <textarea name="body">{entry.body}</textarea>
    </label>
  </form>
{:else}
  <p>No entry to edit.</p>
{/if}
