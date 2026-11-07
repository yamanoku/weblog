<script lang="ts">
  import { Link } from "@void/svelte";

  let { articles = [] } = $props();
</script>

<h1>Create an entry</h1>
<form method="post">
  <label>
    Title
    <input name="title" value="" />
  </label>
  <label>
    Markdown
    <textarea name="body" rows="16"></textarea>
  </label>
  <button type="submit">Save article</button>
</form>

<h2>Articles</h2>
{#if articles.length === 0}
  <p>No articles yet.</p>
{:else}
  <ul>
    {#each articles as article (article.id)}
      <li>
        <Link href={"/edit/" + article.id}>{article.title || article.id}</Link>
        {article.visibility}
      </li>
    {/each}
  </ul>
{/if}
