<script lang="ts">
  import { markdownToHtml } from "../domain/markdown-html.ts";

  let { entry } = $props();
</script>

{#if entry}
  <article>
    <h1>{entry.title}</h1>
    {#if entry.kind === "article" || entry.kind === "bookmark"}
      {@html markdownToHtml(entry.body)}
      {#each entry.images ?? [] as image (image.href)}
        <img src={image.href} alt={image.alt} />
      {/each}
    {:else}
      <p style="white-space: pre-wrap">{entry.body}</p>
    {/if}
  </article>
{:else}
  <p>Empty page</p>
{/if}

<style scoped>
  img {
    max-width: 100%;
    height: auto;
  }
</style>
