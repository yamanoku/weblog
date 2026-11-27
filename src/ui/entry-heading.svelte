<script lang="ts">
  import { mediaEmbedHtml, xPostsFromCreatedAt, type SpeakerDeckPlayers } from "../domain/media-embed.ts";
  import { externalBookmarkHref } from "../domain/public-article.ts";

  let {
    title,
    bookmarkUrl = null,
    speakerdeck = {},
    createdAt = null,
  }: {
    title: string;
    bookmarkUrl?: string | null;
    speakerdeck?: SpeakerDeckPlayers;
    createdAt?: string | null;
  } = $props();
  const href = $derived(externalBookmarkHref(bookmarkUrl));
  const xPosts = $derived(xPostsFromCreatedAt(createdAt));
  const embed = $derived(href ? mediaEmbedHtml(href, null, speakerdeck, "eager", xPosts) : null);
</script>

<div class="entry-heading">
  <div class="dads-heading" data-size="32">
    <h1 class="dads-heading__heading">{title}</h1>
    {#if href && !embed}
      <p class="entry-heading__bookmark-url">
        <a class="dads-link entry-heading__link" href={href} rel="external">{href}</a>
      </p>
    {/if}
  </div>
</div>
{#if embed}
  {@html embed}
{/if}
