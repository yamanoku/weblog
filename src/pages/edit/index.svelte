<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";

  let { articles = [], postedNote = null } = $props();
  const noteForm = useForm("/edit?note", { noteBody: "" }, { resetOnSuccess: true });
</script>

<h1>Create an entry</h1>
<form method="post">
  <label>
    Title
    <input name="title" value="" />
  </label>
  <label>
    Markdown
    <textarea name="body" rows="16"></textarea>
  </label>
  <button type="submit">Save article</button>
</form>

<h2>Post a note</h2>
{#if postedNote}
  <p>Saved <a href={postedNote.canonicalUrl}>{postedNote.canonicalUrl}</a></p>
{/if}
<Form form={noteForm}>
  <label>
    Body
    <textarea name="noteBody" rows="4" bind:value={noteForm.data.noteBody}></textarea>
  </label>
  {#if noteForm.errors.noteBody}
    <p>{noteForm.errors.noteBody}</p>
  {/if}
  <button type="submit">Post</button>
</Form>

<h2>Articles</h2>
{#if articles.length === 0}
  <p>No articles yet.</p>
{:else}
  <ul>
    {#each articles as article (article.id)}
      <li>
        <Link href={"/edit/" + article.id}>{article.title || article.id}</Link>
        {article.visibility}
      </li>
    {/each}
  </ul>
{/if}
