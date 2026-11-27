<script lang="ts">
  import type { RelatedLink } from "../domain/related-pages.ts";

  let { links = [] }: { links?: RelatedLink[] } = $props();
</script>

{#if links.length > 0}
  <section class="related-pages">
    <h2>関連ページ</h2>
    <ul>
      {#each links as link (link.id)}
        <li><a class="dads-link" href={link.href}>{link.text}</a></li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .related-pages h2 {
    margin-block: 1.5rem 0.5rem;
  }

  .related-pages ul {
    margin: 0;
    padding-inline-start: 1.25rem;
  }

  .related-pages li {
    overflow-wrap: anywhere;
  }
</style>
