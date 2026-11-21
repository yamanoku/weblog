<script lang="ts">
  import { externalBookmarkHref } from "../domain/public-article.ts";

  let { title, bookmarkUrl = null }: { title: string; bookmarkUrl?: string | null } = $props();
  const href = $derived(externalBookmarkHref(bookmarkUrl));
</script>

<div class="entry-heading">
  <div class="dads-heading" data-size="32">
    <h1 class="dads-heading__heading">{title}</h1>
    {#if href}
      <a class="dads-link entry-heading__link" href={href} rel="external">{href}</a>
    {/if}
  </div>
</div>
