<script lang="ts">
  import { Link } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";
  import { missingTitleCreateHref, publicArticleHref } from "../domain/public-article.ts";
  import Breadcrumb from "../ui/breadcrumb.svelte";
  import EntryHeading from "../ui/entry-heading.svelte";

  let { entry, owner = false, headTitle = "weblog.yamanoku.net", requestedTitle = "" } = $props();
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
      speakerdeck={entry.speakerdeck ?? {}}
    />
    {#if entry.kind === "note"}
      <p class="entry-body" style="white-space: pre-wrap">{entry.body}</p>
    {:else}
      <div class="entry-body">
        {@html markdownToHtml(entry.body, entry.gyazo ?? {}, entry.speakerdeck ?? {}, entry.icons ?? {})}
      </div>
      {#if entry.kind === "bookmark"}
        {#each entry.images ?? [] as image (image.href)}
          <img src={image.href} alt={image.alt} />
        {/each}
      {/if}
    {/if}
  </article>
  {#if owner && (entry.kind === "article" || entry.kind === "bookmark" || entry.kind === "page")}
    <p><Link class="dads-link" href={`/edit/${entry.id}`}>edit</Link></p>
  {/if}
{:else}
  <p>Empty page</p>
  {#if owner}
    <p><Link class="dads-link" href={missingTitleCreateHref(requestedTitle)}>作成</Link></p>
  {/if}
{/if}
