<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";

  let { entries, owner = false, postedNote = null } = $props();
  const noteForm = useForm("/edit?note", { noteBody: "" }, { resetOnSuccess: true });
</script>

<h1>weblog.yamanoku.net</h1>

{#if owner}
  <h2>Post a note</h2>
  {#if postedNote}
    <p>Saved <a href={postedNote.canonicalUrl}>{postedNote.canonicalUrl}</a></p>
  {/if}
  <Form form={noteForm}>
    <label>
      Body
      <textarea name="noteBody" rows="4" bind:value={noteForm.data.noteBody}></textarea>
    </label>
    <button type="submit">Post</button>
  </Form>
{/if}

<ul>
  {#each entries as entry (entry.id)}
    <li>
      <Link href={entry.href}>{entry.title}</Link>
      {#if entry.kind === "article"}
        {@html markdownToHtml(entry.body)}
      {:else}
        <p style="white-space: pre-wrap">{entry.body}</p>
      {/if}
    </li>
  {/each}
</ul>
