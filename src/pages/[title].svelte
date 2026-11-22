<script lang="ts">
  import { Link } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";
  import { publicArticleHref } from "../domain/public-article.ts";
  import Breadcrumb from "../ui/breadcrumb.svelte";
  import EntryHeading from "../ui/entry-heading.svelte";

  let { entry, owner = false, headTitle = "weblog.yamanoku.net" } = $props();
</script>

<svelte:head>
  <title>{headTitle}</title>
</svelte:head>

{#if entry}
  <Breadcrumb items={[
    { href: "/", label: "トップ" },
    { href: publicArticleHref(entry), label: entry.title, current: true },
  ]} />
  <article class="entry-article">
    <EntryHeading
      title={entry.title}
      bookmarkUrl={entry.kind === "bookmark" ? entry.bookmarkUrl : null}
    />
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
  {#if owner && (entry.kind === "article" || entry.kind === "bookmark")}
    <p><Link class="dads-link" href={`/edit/${entry.id}`}>edit</Link></p>
  {/if}
{:else}
  <p>Empty page</p>
{/if}
