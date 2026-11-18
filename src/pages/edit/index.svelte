<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";

  let { articles = [], notes = [], bookmarks = [] } = $props();
  const articleForm = useForm("/edit", { title: "", body: "" });
  const bookmarkForm = useForm("/edit?bookmark", { title: "", body: "", bookmarkUrl: "" });
  let articleBody = $state<HTMLTextAreaElement | null>(null);
  let bookmarkBody = $state<HTMLTextAreaElement | null>(null);
  let articleImages = idleImages();
  let bookmarkImages = idleImages();

  const postArticle = articleForm.post.bind(articleForm);
  articleForm.post = async (options) => {
    if (articleImages.refuse()) return;
    await postArticle({
      ...options,
      data: {
        title: articleForm.data.title,
        body: articleForm.data.body,
        entryImages: articleImages.payload(),
      },
    });
    if (articleForm.wasSuccessful) articleImages.markStored();
  };

  const postBookmark = bookmarkForm.post.bind(bookmarkForm);
  bookmarkForm.post = async (options) => {
    if (bookmarkImages.refuse()) return;
    await postBookmark({
      ...options,
      data: {
        title: bookmarkForm.data.title,
        body: bookmarkForm.data.body,
        bookmarkUrl: bookmarkForm.data.bookmarkUrl,
        entryImages: bookmarkImages.payload(),
      },
    });
    if (bookmarkForm.wasSuccessful) bookmarkImages.markStored();
  };

  function idleImages() {
    return {
      payload: () => [],
      refuse: () => false,
      markStored: () => undefined,
      onPaste: (_event: ClipboardEvent) => undefined,
    };
  }
</script>

<h1>Create an entry</h1>
<Form form={articleForm} onpaste={(event) => articleImages.onPaste(event)}>
  <label>
    Title
    <input name="title" bind:value={articleForm.data.title} />
  </label>
  <label>
    Markdown
    <textarea name="body" rows="16" bind:value={articleForm.data.body} bind:this={articleBody}></textarea>
  </label>
  <EntryImages
    inputId="article-image"
    getBody={() => articleForm.data.body}
    setBody={(value) => (articleForm.data.body = value)}
    getTextarea={() => articleBody}
    register={(api) => (articleImages = api)}
    serverCode={articleForm.errors.entryImages ?? ""}
  />
  <button type="submit" disabled={articleForm.pending}>Save article</button>
</Form>

<h2>Bookmark</h2>
<Form form={bookmarkForm} onpaste={(event) => bookmarkImages.onPaste(event)}>
  <label>
    Title
    <input name="title" bind:value={bookmarkForm.data.title} />
  </label>
  <label>
    URL
    <input name="bookmarkUrl" bind:value={bookmarkForm.data.bookmarkUrl} />
  </label>
  <label>
    Comment
    <textarea name="body" rows="6" bind:value={bookmarkForm.data.body} bind:this={bookmarkBody}></textarea>
  </label>
  <EntryImages
    inputId="bookmark-image"
    getBody={() => bookmarkForm.data.body}
    setBody={(value) => (bookmarkForm.data.body = value)}
    getTextarea={() => bookmarkBody}
    register={(api) => (bookmarkImages = api)}
    serverCode={bookmarkForm.errors.entryImages ?? ""}
  />
  <button type="submit" disabled={bookmarkForm.pending}>Save bookmark</button>
</Form>

<h2>Notes</h2>
{#if notes.length === 0}
  <p>No notes yet.</p>
{:else}
  <ul>
    {#each notes as note (note.id)}
      <li>
        <p style="white-space: pre-wrap">{note.body}</p>
        {#if note.imageHref}
          <img src={note.imageHref} alt={note.imageAlt ?? ""} />
        {/if}
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

<style scoped>
  textarea,
  input,
  button,
  select {
    font: inherit;
    font-size: max(1rem, 1em);
  }
  textarea,
  input,
  button {
    min-height: 48px;
    box-sizing: border-box;
  }
  textarea:focus-visible,
  input:focus-visible,
  button:focus-visible {
    outline: 3px solid var(--y-black-base, #111);
    outline-offset: 2px;
  }
  img {
    max-width: 100%;
    height: auto;
  }
</style>
