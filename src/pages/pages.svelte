<script lang="ts">
  import { Link } from "@void/svelte";

  let { entries } = $props();
</script>

<h1>公開記事一覧</h1>
<ul>
  {#each entries as entry (entry.id)}
    <li>
      <Link href={entry.href}>{entry.title}</Link>
      <Link href={"/e/" + entry.id} rel="bookmark">パーマリンク</Link>
    </li>
  {/each}
</ul>
