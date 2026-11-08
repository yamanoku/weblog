<script lang="ts">
  import { Link } from "@void/svelte";

  let { articles = [], notes = [], bookmarks = [] } = $props();
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

<h2>Bookmark</h2>
<form method="post" action="?bookmark">
  <label>
    Title
    <input name="title" value="" />
  </label>
  <label>
    URL
    <input name="bookmarkUrl" value="" />
  </label>
  <label>
    Comment
    <textarea name="body" rows="6"></textarea>
  </label>
  <button type="submit">Save bookmark</button>
</form>

<h2>Notes</h2>
{#if notes.length === 0}
  <p>No notes yet.</p>
{:else}
  <ul>
    {#each notes as note (note.id)}
      <li>
        <p style="white-space: pre-wrap">{note.body}</p>
        {note.visibility}
        <form method="post" action="?deleteNote">
          <input type="hidden" name="noteId" value={note.id} />
          <button type="submit">Delete</button>
        </form>
      </li>
    {/each}
  </ul>
{/if}

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

<h2>Bookmarks</h2>
{#if bookmarks.length === 0}
  <p>No bookmarks yet.</p>
{:else}
  <ul>
    {#each bookmarks as bookmark (bookmark.id)}
      <li>
        <Link href={"/edit/" + bookmark.id}>{bookmark.title || bookmark.id}</Link>
        {bookmark.bookmarkUrl}
        {bookmark.visibility}
        <form method="post" action="?deleteBookmark">
          <input type="hidden" name="bookmarkId" value={bookmark.id} />
          <button type="submit">Delete</button>
        </form>
      </li>
    {/each}
  </ul>
{/if}
