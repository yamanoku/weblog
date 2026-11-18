<script lang="ts">
  import { Link } from "@void/svelte";

  let { entries } = $props();
</script>

<h1>公開記事</h1>
{#each entries as entry (entry.id)}
  <article>
    <Link href={entry.href}>{entry.title}</Link>
    <Link href={`/e/${entry.id}`} rel="bookmark">permalink</Link>
    <time datetime={entry.publishedAt}>{entry.publishedAt}</time>
  </article>
{/each}
