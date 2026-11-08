<script lang="ts">
  import { Link } from "@void/svelte";
  import { markdownToHtml } from "../../domain/markdown-html.ts";

  let { entry = null, thread = null, owner = false, refused = null } = $props();
</script>

{#if thread}
  {#if owner && refused === "empty_body"}
    <p>本文が空です</p>
  {/if}
  {#each thread as note (note.id)}
    <article id="note-{note.id}">
      {#if note.replyToId}
        <p><a href="#note-{note.replyToId}">返信先</a></p>
      {/if}
      <p style="white-space: pre-wrap">{note.body}</p>
      <Link href={`/e/${note.id}`}>permalink</Link>
      {#if owner}
        <form method="post" action="/edit?reply">
          <input type="hidden" name="replyTo" value={note.id} />
          <textarea name="noteBody" rows="4" placeholder="返信を書く"></textarea>
          <button type="submit">返信</button>
        </form>
      {/if}
    </article>
  {/each}
{:else if entry}
  <article>
    <h1>{entry.title}</h1>
    {#if entry.kind === "article"}
      {@html markdownToHtml(entry.body)}
    {:else}
      <p>{entry.body}</p>
    {/if}
  </article>
{:else}
  <p>No entry for this URL.</p>
{/if}

<style scoped>
  article form {
    margin-block-start: var(--y-rhythm-1);
  }
  textarea {
    width: 100%;
    height: 100px;
    resize: none;
    padding: var(--y-rhythm-1);
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  button {
    margin-block-start: var(--y-rhythm-1);
  }
</style>
