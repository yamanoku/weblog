<script lang="ts">
  import { markdownToHtml } from "../domain/markdown-html.ts";
  import { publicArticleHref } from "../domain/public-article.ts";
  import Breadcrumb from "../ui/breadcrumb.svelte";

  let { entry } = $props();
</script>

{#if entry}
  <Breadcrumb items={[
    { href: "/", label: "トップ" },
    { href: publicArticleHref(entry), label: entry.title, current: true },
  ]} />
  <article class="entry-article">
    <div class="dads-heading" data-size="32">
      <h1 class="dads-heading__heading">{entry.title}</h1>
    </div>
    {#if entry.kind === "article" || entry.kind === "bookmark"}
      <div class="entry-body">
        {@html markdownToHtml(entry.body)}
      </div>
      {#if entry.kind === "bookmark"}
        {#each entry.images ?? [] as image (image.href)}
          <img src={image.href} alt={image.alt} />
        {/each}
      {/if}
    {:else}
      <p class="entry-body" style="white-space: pre-wrap">{entry.body}</p>
    {/if}
  </article>
{:else}
  <p>Empty page</p>
{/if}
