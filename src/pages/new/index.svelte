<script lang="ts">
  import { onMount } from "svelte";
  import { Form, Link, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";
  import NoteComposer from "../../ui/note-composer.svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";

  const articleForm = useForm("/edit", { title: "", body: "" });
  const bookmarkForm = useForm("/edit?bookmark", { title: "", body: "", bookmarkUrl: "" });
  let createTab = $state<"entry" | "bookmark" | "note">("entry");
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

  function selectCreate(tab: "entry" | "bookmark" | "note", event?: Event) {
    createTab = tab;
    const button = event?.currentTarget;
    if (button instanceof HTMLElement) {
      button.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        container: "nearest",
      } as ScrollIntoViewOptions);
    }
  }

  function onBeforeMatch(event: Event) {
    const panel = event.target;
    if (!(panel instanceof HTMLElement)) return;
    if (panel.id === "create-entry-panel") createTab = "entry";
    if (panel.id === "create-bookmark-panel") createTab = "bookmark";
    if (panel.id === "create-note-panel") createTab = "note";
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

<svelte:head>
  <title>新規 - weblog.yamanoku.net</title>
</svelte:head>

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/new", label: "新規", current: true },
]} />

<p><Link class="dads-link" href="/edit">編集</Link></p>

<div class="create-tabs" onbeforematch={onBeforeMatch}>
  <div class="create-tabs__list" focusgroup="tablist nomemory" aria-label="Create">
    <button
      class="create-tabs__tab"
      type="button"
      role="tab"
      id="create-entry-tab"
      aria-selected={createTab === "entry" ? "true" : "false"}
      aria-controls="create-entry-panel"
      focusgroupstart={createTab === "entry" ? "" : undefined}
      onfocus={(event) => selectCreate("entry", event)}
      onclick={(event) => selectCreate("entry", event)}
    >Entry</button>
    <button
      class="create-tabs__tab"
      type="button"
      role="tab"
      id="create-bookmark-tab"
      aria-selected={createTab === "bookmark" ? "true" : "false"}
      aria-controls="create-bookmark-panel"
      focusgroupstart={createTab === "bookmark" ? "" : undefined}
      onfocus={(event) => selectCreate("bookmark", event)}
      onclick={(event) => selectCreate("bookmark", event)}
    >Bookmark</button>
    <button
      class="create-tabs__tab"
      type="button"
      role="tab"
      id="create-note-tab"
      aria-selected={createTab === "note" ? "true" : "false"}
      aria-controls="create-note-panel"
      focusgroupstart={createTab === "note" ? "" : undefined}
      onfocus={(event) => selectCreate("note", event)}
      onclick={(event) => selectCreate("note", event)}
    >Note</button>
  </div>
  <div class="create-tabs__panels">
    <div role="tabpanel" id="create-entry-panel" aria-labelledby="create-entry-tab" hidden={createTab === "entry" ? undefined : "until-found"}>
      <div class="create-tabs__panel">
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
    </div>
    <div role="tabpanel" id="create-bookmark-panel" aria-labelledby="create-bookmark-tab" hidden={createTab === "bookmark" ? undefined : "until-found"}>
      <div class="create-tabs__panel">
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
    <div role="tabpanel" id="create-note-panel" aria-labelledby="create-note-tab" hidden={createTab === "note" ? undefined : "until-found"}>
      <div class="create-tabs__panel">
        <NoteComposer />
      </div>
    </div>
  </div>
</div>

<style>
  .create-tabs__panels {
    display: grid;
  }

  .create-tabs__panels > [role="tabpanel"] {
    grid-area: 1 / 1;
  }

  /* until-found panels stay in this cell and stretch over the open form. */
  .create-tabs__panels > [role="tabpanel"][hidden="until-found"] {
    pointer-events: none;
  }

  .create-tabs__panels > [role="tabpanel"]:not([hidden]) {
    z-index: 1;
  }

  .create-tabs__panel {
    padding-block-start: 1lh;
  }

  .create-tabs__list {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: inline proximity;
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
    scroll-snap-align: start;
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
