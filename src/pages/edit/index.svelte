<script lang="ts">
  import { Link } from "@void/svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";

  let { articles = [], notes = [], bookmarks = [] } = $props();
</script>

<svelte:head>
  <title>編集 - weblog.yamanoku.net</title>
</svelte:head>

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/edit", label: "編集", current: true },
]} />

<p><Link class="dads-link" href="/new">新規</Link></p>

<div class="edit-lists">
  <div>
    <div class="dads-heading" data-size="24">
      <h2 class="dads-heading__heading">Entries</h2>
    </div>
    {#if articles.length === 0}
      <p>No entries yet.</p>
    {:else}
      <ul class="dads-list" data-spacing="8">
        {#each articles as article (article.id)}
          <li>
            <Link class="dads-link" href={"/edit/" + article.id}>{article.title || article.id}</Link>
            {article.visibility}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div>
    <div class="dads-heading" data-size="24">
      <h2 class="dads-heading__heading">Bookmarks</h2>
    </div>
    {#if bookmarks.length === 0}
      <p>No bookmarks yet.</p>
    {:else}
      <ul class="dads-list" data-spacing="8">
        {#each bookmarks as bookmark (bookmark.id)}
          <li>
            <Link class="dads-link" href={"/edit/" + bookmark.id}>{bookmark.title || bookmark.id}</Link>
            {bookmark.bookmarkUrl}
            {bookmark.visibility}
            <form method="post" action="?deleteBookmark">
              <input type="hidden" name="bookmarkId" value={bookmark.id} />
              <button class="dads-button" data-size="sm" data-type="outline" type="submit">Delete</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div>
    <div class="dads-heading" data-size="24">
      <h2 class="dads-heading__heading">Notes</h2>
    </div>
    {#if notes.length === 0}
      <p>No notes yet.</p>
    {:else}
      <ul class="dads-list" data-spacing="8">
        {#each notes as note (note.id)}
          <li>
            <p style="white-space: pre-wrap">{note.body}</p>
            {#if note.imageHref}
              <img src={note.imageHref} alt={note.imageAlt ?? ""} />
            {/if}
            <p>{note.visibility}</p>
            <form method="post" action="?deleteNote">
              <input type="hidden" name="noteId" value={note.id} />
              <button class="dads-button" data-size="sm" data-type="outline" type="submit">Delete</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .edit-lists {
    display: flex;
    flex-direction: column;
    gap: 2lh;
  }
</style>
