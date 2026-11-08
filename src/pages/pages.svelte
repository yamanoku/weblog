<script lang="ts">
  import { Link } from "@void/svelte";

  let { entries } = $props();
</script>

<h1>Public titles</h1>
<ul>
  {#each entries as entry (entry.id)}
    <li><Link href={entry.href}>{entry.title}</Link></li>
  {/each}
</ul>
