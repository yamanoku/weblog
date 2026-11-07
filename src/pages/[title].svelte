<script lang="ts">
  import { markdownToHtml } from "../domain/markdown-html.ts";

  let { entry } = $props();
</script>

{#if entry}
  <article>
    <h1>{entry.title}</h1>
    {#if entry.kind === "article"}
      {@html markdownToHtml(entry.body)}
    {:else}
      <p style="white-space: pre-wrap">{entry.body}</p>
    {/if}
  </article>
{:else}
  <p>Empty page</p>
{/if}
