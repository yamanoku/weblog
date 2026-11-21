<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";

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

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/edit", label: "編集", current: true },
]} />

<div class="dads-heading" data-size="32">
  <h1 id="create-entry" class="dads-heading__heading">Create an entry</h1>
</div>
<Form class="form-stack" form={articleForm} aria-labelledby="create-entry" onpaste={(event) => articleImages.onPaste(event)}>
  <div class="dads-form-control-label" data-size="md">
    <label class="dads-form-control-label__label" for="article-title">Title</label>
    <div class="dads-form-control-label__field">
      <span class="dads-input-text">
        <input id="article-title" class="dads-input-text__input" name="title" type="text" data-size="md" bind:value={articleForm.data.title} />
      </span>
    </div>
  </div>
  <div class="dads-form-control-label" data-size="md">
    <label class="dads-form-control-label__label" for="article-body">Markdown</label>
    <div class="dads-form-control-label__field">
      <span class="dads-textarea">
        <textarea id="article-body" class="dads-textarea__textarea" name="body" rows="16" bind:value={articleForm.data.body} bind:this={articleBody}></textarea>
      </span>
    </div>
  </div>
  <EntryImages
    inputId="article-image"
    getBody={() => articleForm.data.body}
    setBody={(value) => (articleForm.data.body = value)}
    getTextarea={() => articleBody}
    register={(api) => (articleImages = api)}
    serverCode={articleForm.errors.entryImages ?? ""}
  />
  <button class="dads-button" data-size="md" data-type="solid-fill" type="submit" disabled={articleForm.pending}>Save article</button>
</Form>

<div class="dads-heading" data-size="24">
  <h2 id="create-bookmark" class="dads-heading__heading">Bookmark</h2>
</div>
<Form class="form-stack" form={bookmarkForm} aria-labelledby="create-bookmark" onpaste={(event) => bookmarkImages.onPaste(event)}>
  <div class="dads-form-control-label" data-size="md">
    <label class="dads-form-control-label__label" for="bookmark-title">Title</label>
    <div class="dads-form-control-label__field">
      <span class="dads-input-text">
        <input id="bookmark-title" class="dads-input-text__input" name="title" type="text" data-size="md" bind:value={bookmarkForm.data.title} />
      </span>
    </div>
  </div>
  <div class="dads-form-control-label" data-size="md">
    <label class="dads-form-control-label__label" for="bookmark-url">URL</label>
    <div class="dads-form-control-label__field">
      <span class="dads-input-text">
        <input
          id="bookmark-url"
          class="dads-input-text__input"
          name="bookmarkUrl"
          type="url"
          data-size="md"
          inputmode="url"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          bind:value={bookmarkForm.data.bookmarkUrl}
        />
      </span>
    </div>
  </div>
  <div class="dads-form-control-label" data-size="md">
    <label class="dads-form-control-label__label" for="bookmark-body">Comment</label>
    <div class="dads-form-control-label__field">
      <span class="dads-textarea">
        <textarea id="bookmark-body" class="dads-textarea__textarea" name="body" rows="6" bind:value={bookmarkForm.data.body} bind:this={bookmarkBody}></textarea>
      </span>
    </div>
  </div>
  <EntryImages
    inputId="bookmark-image"
    getBody={() => bookmarkForm.data.body}
    setBody={(value) => (bookmarkForm.data.body = value)}
    getTextarea={() => bookmarkBody}
    register={(api) => (bookmarkImages = api)}
    serverCode={bookmarkForm.errors.entryImages ?? ""}
  />
  <button class="dads-button" data-size="md" data-type="solid-fill" type="submit" disabled={bookmarkForm.pending}>Save bookmark</button>
</Form>

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

<div class="dads-heading" data-size="24">
  <h2 class="dads-heading__heading">Articles</h2>
</div>
{#if articles.length === 0}
  <p>No articles yet.</p>
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
