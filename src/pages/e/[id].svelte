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
      <p style="white-space: pre-wrap">{note.body}</p>
      {#if note.imageHref}
        <img src={note.imageHref} alt={note.imageAlt ?? ""} />
      {/if}
      <Link href={`/e/${note.id}`}>permalink</Link>
      {#if owner}
      <details>
        <summary>返信する</summary>
        <form method="post" action="/edit?reply">
          <input type="hidden" name="replyTo" value={note.id} />
          <textarea name="noteBody" rows="4"></textarea>
          <button type="submit">返信</button>
        </form>
      </details>
      {/if}
    </article>
  {/each}
{:else if entry}
  <article>
    <h1>{entry.title}</h1>
    {#if entry.kind === "article" || entry.kind === "bookmark"}
      {@html markdownToHtml(entry.body)}
      {#if entry.kind === "bookmark"}
        {#each entry.images ?? [] as image (image.href)}
          <img src={image.href} alt={image.alt} />
        {/each}
      {/if}
    {:else}
      <p>{entry.body}</p>
    {/if}
  </article>
{:else}
  <p>No entry for this URL.</p>
{/if}

<style scoped>
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
  img {
    max-width: 100%;
    height: auto;
  }
</style>
