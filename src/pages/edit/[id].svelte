<script lang="ts">
  let { entry } = $props();
</script>

<h1>Edit {entry.title}</h1>
{#if entry.kind === "bookmark"}
  <form method="post">
    <label>
      Title
      <input name="title" value={entry.title} />
    </label>
    <label>
      URL
      <input name="bookmarkUrl" value={entry.bookmarkUrl ?? ""} />
    </label>
    <label>
      Comment
      <textarea name="body" rows="8" value={entry.body}></textarea>
    </label>
    <label>
      Visibility
      <select name="visibility">
        <option value="draft" selected={entry.visibility === "draft"}>Draft</option>
        <option value="public" selected={entry.visibility === "public"}>Public</option>
      </select>
    </label>
    <button type="submit">Save bookmark</button>
  </form>
{:else}
  <form method="post">
    <label>
      Title
      <input name="title" value={entry.title} />
    </label>
    <label>
      Markdown
      <textarea name="body" rows="16">{entry.body}</textarea>
    </label>
    <label>
      Visibility
      <select name="visibility">
        <option value="draft" selected={entry.visibility === "draft"}>Draft</option>
        <option value="public" selected={entry.visibility === "public"}>Public</option>
      </select>
    </label>
    <button type="submit">Save article</button>
  </form>
{/if}
