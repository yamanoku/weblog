<script lang="ts">
  let { entry } = $props();
</script>

<h1>Edit {entry.title}</h1>
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
