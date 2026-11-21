<script lang="ts">
  import { Form, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";

  let { entry, images = [] } = $props();
  const editForm = useForm(`/edit/${entry.id}`, {
    title: entry.title,
    body: entry.body,
    visibility: entry.visibility,
    bookmarkUrl: entry.bookmarkUrl ?? "",
  });
  let bodyArea = $state<HTMLTextAreaElement | null>(null);
  let entryImages = {
    payload: () => [],
    refuse: () => false,
    markStored: () => undefined,
    onPaste: (_event: ClipboardEvent) => undefined,
  };

  const postEdit = editForm.post.bind(editForm);
  editForm.post = async (options) => {
    if (entryImages.refuse()) return;
    await postEdit({
      ...options,
      data: {
        title: editForm.data.title,
        body: editForm.data.body,
        visibility: editForm.data.visibility,
        bookmarkUrl: editForm.data.bookmarkUrl,
        entryImages: entryImages.payload(),
      },
    });
    if (editForm.wasSuccessful) entryImages.markStored();
  };
</script>

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/edit", label: "編集" },
  { href: `/edit/${entry.id}`, label: entry.title || entry.id, current: true },
]} />

<div class="dads-heading" data-size="32">
  <h1 id="edit-entry" class="dads-heading__heading">Edit {entry.title}</h1>
</div>
<Form class="form-stack" form={editForm} aria-labelledby="edit-entry" onpaste={(event) => entryImages.onPaste(event)}>
  {#if entry.kind === "bookmark"}
    <div class="dads-form-control-label" data-size="md">
      <label class="dads-form-control-label__label" for="edit-title">Title</label>
      <div class="dads-form-control-label__field">
        <span class="dads-input-text">
          <input id="edit-title" class="dads-input-text__input" name="title" type="text" data-size="md" bind:value={editForm.data.title} />
        </span>
      </div>
    </div>
    <div class="dads-form-control-label" data-size="md">
      <label class="dads-form-control-label__label" for="edit-url">URL</label>
      <div class="dads-form-control-label__field">
        <span class="dads-input-text">
          <input
            id="edit-url"
            class="dads-input-text__input"
            name="bookmarkUrl"
            type="url"
            data-size="md"
            inputmode="url"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            bind:value={editForm.data.bookmarkUrl}
          />
        </span>
      </div>
    </div>
    <div class="dads-form-control-label" data-size="md">
      <label class="dads-form-control-label__label" for="edit-body">Comment</label>
      <div class="dads-form-control-label__field">
        <span class="dads-textarea">
          <textarea id="edit-body" class="dads-textarea__textarea" name="body" rows="8" bind:value={editForm.data.body} bind:this={bodyArea}></textarea>
        </span>
      </div>
    </div>
  {:else}
    <div class="dads-form-control-label" data-size="md">
      <label class="dads-form-control-label__label" for="edit-title">Title</label>
      <div class="dads-form-control-label__field">
        <span class="dads-input-text">
          <input id="edit-title" class="dads-input-text__input" name="title" type="text" data-size="md" bind:value={editForm.data.title} />
        </span>
      </div>
    </div>
    <div class="dads-form-control-label" data-size="md">
      <label class="dads-form-control-label__label" for="edit-body">Markdown</label>
      <div class="dads-form-control-label__field">
        <span class="dads-textarea">
          <textarea id="edit-body" class="dads-textarea__textarea" name="body" rows="16" bind:value={editForm.data.body} bind:this={bodyArea}></textarea>
        </span>
      </div>
    </div>
  {/if}
  <EntryImages
    initial={images}
    inputId="entry-image"
    getBody={() => editForm.data.body}
    setBody={(value) => (editForm.data.body = value)}
    getTextarea={() => bodyArea}
    register={(api) => (entryImages = api)}
    serverCode={editForm.errors.entryImages ?? ""}
  />
  <div class="dads-form-control-label" data-size="md">
    <label class="dads-form-control-label__label" for="edit-visibility">Visibility</label>
    <div class="dads-form-control-label__field">
      <span class="dads-select">
        <span class="dads-select__control">
          <select id="edit-visibility" class="dads-select__select" name="visibility" data-size="md" bind:value={editForm.data.visibility}>
            <option value="draft">Draft</option>
            <option value="public">Public</option>
          </select>
          <svg class="dads-select__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 17L3 8L4 7L12 15L20 7L21 8L12 17Z" fill="currentcolor"/>
          </svg>
        </span>
      </span>
    </div>
  </div>
  <button class="dads-button" data-size="md" data-type="solid-fill" type="submit" disabled={editForm.pending}>
    {entry.kind === "bookmark" ? "Save bookmark" : "Save article"}
  </button>
</Form>
