<script>
  import { Link } from "@void/svelte";

  let { entries } = $props();
</script>

<h1>Deliverable entries</h1>
<ul>
  {#each entries as entry (entry.id)}
    <li>
      <Link href={"/" + entry.title}>{entry.title}</Link>
      <p>{entry.body}</p>
    </li>
  {/each}
</ul>
