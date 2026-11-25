<script lang="ts">
  import { Link } from "@void/svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";
  import EditJump from "../../ui/edit-jump.svelte";

  let { diaries = [], articles = [], notes = [], bookmarks = [] } = $props();

  const optionLimit = 80;

  function clip(text: string): string {
    const chars = Array.from(text);
    if (chars.length <= optionLimit) return text;
    return `${chars.slice(0, optionLimit).join("")}…`;
  }

  function entryOption(entry: { id: string; title: string; visibility: string }): string {
    const name = entry.title.trim() ? entry.title : entry.id;
    return `${clip(name)} (${entry.visibility})`;
  }

  function bookmarkOption(bookmark: {
    id: string;
    title: string;
    bookmarkUrl: string;
    visibility: string;
  }): string {
    const name = bookmark.title.trim() ? bookmark.title : bookmark.id;
    return `${clip(name)} ${clip(bookmark.bookmarkUrl)} (${bookmark.visibility})`;
  }

  function noteOption(note: { id: string; body: string; visibility: string; imageHref: string | null }): string {
    const body = note.body.replace(/\s+/g, " ").trim();
    const text = body || (note.imageHref ? "画像" : note.id);
    return `${clip(text)} (${note.visibility})`;
  }
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
  <EditJump
    id="edit-diaries"
    heading="Diaries"
    empty="No diaries yet."
    items={diaries.map((diary: { id: string; title: string; visibility: string }) => ({
      id: diary.id,
      label: entryOption(diary),
    }))}
    path={(id) => "/edit/" + id}
  />
  <EditJump
    id="edit-entries"
    heading="Entries"
    empty="No entries yet."
    items={articles.map((article: { id: string; title: string; visibility: string }) => ({
      id: article.id,
      label: entryOption(article),
    }))}
    path={(id) => "/edit/" + id}
  />
  <EditJump
    id="edit-bookmarks"
    heading="Bookmarks"
    empty="No bookmarks yet."
    items={bookmarks.map((bookmark: { id: string; title: string; bookmarkUrl: string; visibility: string }) => ({
      id: bookmark.id,
      label: bookmarkOption(bookmark),
    }))}
    path={(id) => "/edit/" + id}
    deleteAction="?deleteBookmark"
    deleteName="bookmarkId"
  />
  <EditJump
    id="edit-notes"
    heading="Notes"
    empty="No notes yet."
    items={notes.map((note: { id: string; body: string; visibility: string; imageHref: string | null }) => ({
      id: note.id,
      label: noteOption(note),
    }))}
    path={(id) => "/e/" + id}
    deleteAction="?deleteNote"
    deleteName="noteId"
  />
</div>

<style>
  .edit-lists {
    display: flex;
    flex-direction: column;
    gap: 2lh;
  }
</style>
