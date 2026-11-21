<script lang="ts">
  import { onMount } from "svelte";
  import { Form, Link, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";

  let { articles = [], notes = [], bookmarks = [] } = $props();
  const articleForm = useForm("/edit", { title: "", body: "" });
  const bookmarkForm = useForm("/edit?bookmark", { title: "", body: "", bookmarkUrl: "" });
  let createTab = $state<"entry" | "bookmark">("entry");
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

  function selectCreate(tab: "entry" | "bookmark", event?: Event) {
    createTab = tab;
    const button = event?.currentTarget;
    if (button instanceof HTMLElement) {
      button.scrollIntoView({ block: "nearest", inline: "nearest", container: "nearest" });
    }
  }

  function onBeforeMatch(event: Event) {
    const panel = event.target;
    if (!(panel instanceof HTMLElement)) return;
    if (panel.id === "create-entry-panel") createTab = "entry";
    if (panel.id === "create-bookmark-panel") createTab = "bookmark";
    const panels = panel.parentElement?.querySelectorAll<HTMLElement>("[role='tabpanel']") ?? [];
    for (const other of panels) {
      if (other !== panel) other.hidden = "until-found";
    }
  }

  onMount(() => {
    if (!Object.hasOwn(HTMLElement.prototype, "focusGroup")) {
      void import("@microsoft/focusgroup-polyfill").then(({ polyfill }) => {
        polyfill();
      });
    }
  });
</script>

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/edit", label: "編集", current: true },
]} />

<div class="create-tabs" onbeforematch={onBeforeMatch}>
  <div class="create-tabs__list" focusgroup="tablist nomemory" aria-label="Create">
    <button
      class="create-tabs__tab"
      type="button"
      id="create-entry-tab"
      aria-selected={createTab === "entry" ? "true" : "false"}
      focusgroupstart={createTab === "entry" ? "" : undefined}
      onfocus={(event) => selectCreate("entry", event)}
      onclick={(event) => selectCreate("entry", event)}
    >Create an entry</button>
    <button
      class="create-tabs__tab"
      type="button"
      id="create-bookmark-tab"
      aria-selected={createTab === "bookmark" ? "true" : "false"}
      focusgroupstart={createTab === "bookmark" ? "" : undefined}
      onfocus={(event) => selectCreate("bookmark", event)}
      onclick={(event) => selectCreate("bookmark", event)}
    >Bookmark</button>
  </div>
  <div class="create-tabs__panels">
    <div role="tabpanel" id="create-entry-panel" aria-labelledby="create-entry-tab" hidden={createTab === "entry" ? undefined : "until-found"}>
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
    </div>
    <div role="tabpanel" id="create-bookmark-panel" aria-labelledby="create-bookmark-tab" hidden={createTab === "bookmark" ? undefined : "until-found"}>
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
    </div>
  </div>
</div>

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

<style>
  .create-tabs__panels {
    display: grid;
  }

  .create-tabs__panels > [role="tabpanel"] {
    grid-area: 1 / 1;
  }

  .create-tabs__list {
    display: flex;
    overflow-x: auto;
    border-block-end: 1px solid var(--color-neutral-solid-gray-420);
  }

  .create-tabs__tab {
    position: relative;
    flex: none;
    margin: 0;
    border: 0;
    padding: 0.75rem 1rem;
    background: transparent;
    color: var(--color-neutral-solid-gray-800);
    font: inherit;
    cursor: pointer;
  }

  .create-tabs__tab[aria-selected="true"] {
    color: var(--color-primitive-blue-600);
  }

  .create-tabs__tab[aria-selected="true"]::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    border-block-end: 3px solid var(--color-primitive-blue-600);
  }

  .create-tabs__tab:focus-visible {
    outline: 2px solid var(--color-primitive-blue-600);
    outline-offset: 2px;
  }

  @media (forced-colors: active) {
    .create-tabs__tab[aria-selected="true"] {
      color: SelectedItem;
    }

    .create-tabs__tab[aria-selected="true"]::after {
      border-block-end-color: SelectedItem;
    }

    .create-tabs__tab:focus-visible {
      outline-color: Highlight;
    }
  }
</style>
