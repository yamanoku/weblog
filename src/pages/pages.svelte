<script lang="ts">
  import { Link } from "@void/svelte";
  import Breadcrumb from "../ui/breadcrumb.svelte";

  let { entries } = $props();
</script>

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/pages", label: "公開記事", current: true },
]} />

<div class="dads-heading" data-size="32">
  <h1 class="dads-heading__heading">公開記事</h1>
</div>

<div class="entry-list">
  {#each entries as entry (entry.id)}
    <article>
      <p class="dads-u-std-18B-160">
        <Link class="dads-link" href={entry.href}>{entry.title}</Link>
      </p>
      <p>
        <Link class="dads-link" href={`/e/${entry.id}`} rel="bookmark">permalink</Link>
      </p>
      <p><time datetime={entry.publishedAt}>{entry.publishedAt}</time></p>
    </article>
  {/each}
</div>
