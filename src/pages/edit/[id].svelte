<script lang="ts">
  import { Form, useForm } from "@void/svelte";
  import EntryImages from "../../ui/entry-images-field.svelte";

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

<h1>Edit {entry.title}</h1>
<Form form={editForm} onpaste={(event) => entryImages.onPaste(event)}>
  {#if entry.kind === "bookmark"}
    <label>
      Title
      <input name="title" bind:value={editForm.data.title} />
    </label>
    <label>
      URL
      <input name="bookmarkUrl" bind:value={editForm.data.bookmarkUrl} />
    </label>
    <label>
      Comment
      <textarea name="body" rows="8" bind:value={editForm.data.body} bind:this={bodyArea}></textarea>
    </label>
  {:else}
    <label>
      Title
      <input name="title" bind:value={editForm.data.title} />
    </label>
    <label>
      Markdown
      <textarea name="body" rows="16" bind:value={editForm.data.body} bind:this={bodyArea}></textarea>
    </label>
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
  <label>
    Visibility
    <select name="visibility" bind:value={editForm.data.visibility}>
      <option value="draft">Draft</option>
      <option value="public">Public</option>
    </select>
  </label>
  <button type="submit" disabled={editForm.pending}>
    {entry.kind === "bookmark" ? "Save bookmark" : "Save article"}
  </button>
</Form>

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
  button,
  select {
    min-height: 48px;
    box-sizing: border-box;
  }
  textarea:focus-visible,
  input:focus-visible,
  button:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--y-black-base, #111);
    outline-offset: 2px;
  }
</style>
