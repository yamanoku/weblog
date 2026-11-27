<script lang="ts">
  import { onMount } from "svelte";
  import { Form, Link, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";
  import NoteComposer from "../../ui/note-composer.svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";

  let { presetTitle = "", diaryTitle = "" } = $props();

  const diaryForm = useForm("/edit?diary", { title: diaryTitle, body: "", visibility: "public" });
  const articleForm = useForm("/edit", { title: presetTitle, body: "", visibility: "public", posted: "" });
  const bookmarkForm = useForm("/edit?bookmark", {
    title: "",
    body: "",
    bookmarkUrl: "",
    visibility: "public",
    posted: "",
  });
  let createTab = $state<"diary" | "entry" | "bookmark" | "note">(
    presetTitle.trim().length > 0 ? "entry" : "diary",
  );
  let diaryBody = $state<HTMLTextAreaElement | null>(null);
  let articleBody = $state<HTMLTextAreaElement | null>(null);
  let bookmarkBody = $state<HTMLTextAreaElement | null>(null);
  let diaryImages = idleImages();
  let articleImages = idleImages();
  let bookmarkImages = idleImages();

  const postDiary = diaryForm.post.bind(diaryForm);
  diaryForm.post = async (options) => {
    if (diaryImages.refuse()) return;
    await postDiary({
      ...options,
      data: {
        title: diaryForm.data.title,
        body: diaryForm.data.body,
        visibility: diaryForm.data.visibility,
        entryImages: diaryImages.payload(),
      },
    });
    if (diaryForm.wasSuccessful) diaryImages.markStored();
  };

  const postArticle = articleForm.post.bind(articleForm);
  articleForm.post = async (options) => {
    if (articleImages.refuse()) return;
    await postArticle({
      ...options,
      data: {
        title: articleForm.data.title,
        body: articleForm.data.body,
        visibility: articleForm.data.visibility,
        posted: articleForm.data.posted,
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
        visibility: bookmarkForm.data.visibility,
        posted: bookmarkForm.data.posted,
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

  function selectCreate(tab: "diary" | "entry" | "bookmark" | "note", event?: Event) {
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
    if (panel.id === "create-diary-panel") createTab = "diary";
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
      id="create-diary-tab"
      aria-selected={createTab === "diary" ? "true" : "false"}
      aria-controls="create-diary-panel"
      focusgroupstart={createTab === "diary" ? "" : undefined}
      onfocus={(event) => selectCreate("diary", event)}
      onclick={(event) => selectCreate("diary", event)}
    >Diary</button>
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
    <div role="tabpanel" id="create-diary-panel" aria-labelledby="create-diary-tab" hidden={createTab === "diary" ? undefined : "until-found"}>
      <div class="create-tabs__panel">
        <Form class="form-stack entry--diary" form={diaryForm} aria-labelledby="create-diary" onpaste={(event) => diaryImages.onPaste(event)}>
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="diary-title">Title</label>
            <div class="dads-form-control-label__field">
              <span class="dads-input-text">
                <input id="diary-title" class="dads-input-text__input" name="title" type="text" data-size="md" bind:value={diaryForm.data.title} />
              </span>
            </div>
          </div>
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="diary-body">Markdown</label>
            <div class="dads-form-control-label__field">
              <span class="dads-textarea">
                <textarea id="diary-body" class="dads-textarea__textarea" name="body" rows="16" bind:value={diaryForm.data.body} bind:this={diaryBody}></textarea>
              </span>
            </div>
          </div>
          <EntryImages
            inputId="diary-image"
            getBody={() => diaryForm.data.body}
            setBody={(value) => (diaryForm.data.body = value)}
            getTextarea={() => diaryBody}
            register={(api) => (diaryImages = api)}
            serverCode={diaryForm.errors.entryImages ?? ""}
          />
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="diary-visibility">Visibility</label>
            <div class="dads-form-control-label__field">
              <span class="dads-select">
                <span class="dads-select__control">
                  <select id="diary-visibility" class="dads-select__select" name="visibility" data-size="md" bind:value={diaryForm.data.visibility}>
                    <option value="public">Public</option>
                    <option value="draft">Draft</option>
                  </select>
                  <svg class="dads-select__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 17L3 8L4 7L12 15L20 7L21 8L12 17Z" fill="currentcolor"/>
                  </svg>
                </span>
              </span>
            </div>
          </div>
          <button class="dads-button" data-size="md" data-type="solid-fill" type="submit" disabled={diaryForm.pending}>Save diary</button>
        </Form>
      </div>
    </div>
    <div role="tabpanel" id="create-entry-panel" aria-labelledby="create-entry-tab" hidden={createTab === "entry" ? undefined : "until-found"}>
      <div class="create-tabs__panel">
        <Form class="form-stack entry--article" form={articleForm} aria-labelledby="create-entry" onpaste={(event) => articleImages.onPaste(event)}>
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
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="article-posted">Posted</label>
            <p id="article-posted-hint" class="dads-form-control-label__support-text">空欄のときは保存した時刻</p>
            <div class="dads-form-control-label__field">
              <span class="dads-input-text">
                <input
                  id="article-posted"
                  class="dads-input-text__input"
                  name="posted"
                  type="date"
                  data-size="md"
                  bind:value={articleForm.data.posted}
                  aria-invalid={articleForm.errors.posted ? "true" : undefined}
                  aria-describedby={articleForm.errors.posted ? "article-posted-hint article-posted-error" : "article-posted-hint"}
                />
                {#if articleForm.errors.posted}
                  <span id="article-posted-error" class="dads-input-text__error-text" role="alert">日付を確認してください</span>
                {/if}
              </span>
            </div>
          </div>
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="article-visibility">Visibility</label>
            <div class="dads-form-control-label__field">
              <span class="dads-select">
                <span class="dads-select__control">
                  <select id="article-visibility" class="dads-select__select" name="visibility" data-size="md" bind:value={articleForm.data.visibility}>
                    <option value="public">Public</option>
                    <option value="draft">Draft</option>
                  </select>
                  <svg class="dads-select__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 17L3 8L4 7L12 15L20 7L21 8L12 17Z" fill="currentcolor"/>
                  </svg>
                </span>
              </span>
            </div>
          </div>
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
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="bookmark-posted">Posted</label>
            <p id="bookmark-posted-hint" class="dads-form-control-label__support-text">空欄のときは保存した時刻</p>
            <div class="dads-form-control-label__field">
              <span class="dads-input-text">
                <input
                  id="bookmark-posted"
                  class="dads-input-text__input"
                  name="posted"
                  type="date"
                  data-size="md"
                  bind:value={bookmarkForm.data.posted}
                  aria-invalid={bookmarkForm.errors.posted ? "true" : undefined}
                  aria-describedby={bookmarkForm.errors.posted ? "bookmark-posted-hint bookmark-posted-error" : "bookmark-posted-hint"}
                />
                {#if bookmarkForm.errors.posted}
                  <span id="bookmark-posted-error" class="dads-input-text__error-text" role="alert">日付を確認してください</span>
                {/if}
              </span>
            </div>
          </div>
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="bookmark-visibility">Visibility</label>
            <div class="dads-form-control-label__field">
              <span class="dads-select">
                <span class="dads-select__control">
                  <select id="bookmark-visibility" class="dads-select__select" name="visibility" data-size="md" bind:value={bookmarkForm.data.visibility}>
                    <option value="public">Public</option>
                    <option value="draft">Draft</option>
                  </select>
                  <svg class="dads-select__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 17L3 8L4 7L12 15L20 7L21 8L12 17Z" fill="currentcolor"/>
                  </svg>
                </span>
              </span>
            </div>
          </div>
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
