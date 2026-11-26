<script lang="ts">
  import type { SameDayLink } from "../domain/same-day.ts";

  let { links = [] }: { links?: SameDayLink[] } = $props();
</script>

{#if links.length > 0}
  <section class="same-day">
    <h2>当日書いたコンテンツ</h2>
    <ul>
      {#each links as link (link.id)}
        <li><a class="dads-link" href={link.href}>{link.text}</a></li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .same-day h2 {
    margin-block: 1.5rem 0.5rem;
  }

  .same-day ul {
    margin: 0;
    padding-inline-start: 1.25rem;
  }

  .same-day li {
    overflow-wrap: anywhere;
  }
</style>
