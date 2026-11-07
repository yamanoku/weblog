<script lang="ts">
  import { Link } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";

  let { entries } = $props();
</script>

<h1>Deliverable entries</h1>
<p>weblog.yamanoku.net</p>
<ul>
  {#each entries as entry (entry.id)}
    <li>
      <Link href={entry.href}>{entry.title}</Link>
      {#if entry.kind === "article"}
        {@html markdownToHtml(entry.body)}
      {:else}
        <p style="white-space: pre-wrap">{entry.body}</p>
      {/if}
    </li>
  {/each}
</ul>
