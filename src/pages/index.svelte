<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";
  import { acceptNoteImage, encodeNoteImage, noteImageAltLimit } from "../domain/note-image.ts";

  let { entries, owner = false, postedNote = null } = $props();
  const noteForm = useForm("/edit?note", { noteBody: "" }, { resetOnSuccess: true });
  let attachedBase64 = "";
  let previewUrl = $state("");
  let attachError = $state("");
  let fileInput = $state<HTMLInputElement | null>(null);

  const postNote = noteForm.post.bind(noteForm);
  noteForm.post = async (options) => {
    if (refuseAlt()) return;
    await postNote({
      ...options,
      data: {
        noteBody: noteForm.data.noteBody,
        noteImage: attachedBase64,
        noteImageAlt: imageAlt.trim(),
      },
    });
    if (noteForm.errors.noteImageAlt) altInput?.focus();
    if (noteForm.wasSuccessful) {
      attachedBase64 = "";
      previewUrl = "";
      attachError = "";
      altError = "";
      imageAlt = "";
    }
  };

  $effect(() => {
    const url = previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  });

  function noteFieldError(code: string): string {
    if (code === "empty_body") return "本文か画像を入れてください";
    if (code === "image_type") return "JPEG、PNG、GIF、WebP の画像だけ添付できます";
    if (code === "image_too_large") return "画像は 8 MiB までです";
    if (code === "image_count") return "画像は 1 枚だけです";
    if (code === "image_alt") return "代替テキストを入れてください";
    if (code === "image_alt_length") return "代替テキストは 1500 字までです";
    return "投稿できませんでした";
  }

  let imageAlt = $state("");
  let altError = $state("");
  let altInput = $state<HTMLInputElement | null>(null);
  let attachGeneration = 0;

  function onAltInput() {
    if (imageAlt.trim() !== "") altError = "";
  }

  $effect(() => {
    const input = altInput;
    if (!input) return;
    const text = imageAlt.trim();
    if (text === "") input.setCustomValidity("代替テキストを入れてください");
    else if ([...text].length > noteImageAltLimit) {
      input.setCustomValidity("代替テキストは 1500 字までです");
    } else input.setCustomValidity("");
  });

  function refuseAlt(): boolean {
    if (attachedBase64 === "") return false;
    const text = imageAlt.trim();
    if (text === "") {
      altError = "image_alt";
      altInput?.focus();
      return true;
    }
    if ([...text].length > noteImageAltLimit) {
      altError = "image_alt_length";
      altInput?.focus();
      return true;
    }
    altError = "";
    return false;
  }

  async function attachFile(file: File) {
    const generation = ++attachGeneration;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (generation !== attachGeneration) return;
    const accepted = acceptNoteImage(bytes);
    if ("error" in accepted) {
      attachError = accepted.error;
      fileInput?.focus();
      return;
    }
    attachError = "";
    attachedBase64 = encodeNoteImage(bytes);
    previewUrl = URL.createObjectURL(file);
  }

  function onFile(event: Event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = "";
    if (file) void attachFile(file);
  }

  function onPaste(event: ClipboardEvent) {
    const items = [...(event.clipboardData?.items ?? [])];
    const image = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (!image) return;
    const file = image.getAsFile();
    if (!file) return;
    event.preventDefault();
    void attachFile(file);
  }

  function removeImage() {
    attachedBase64 = "";
    previewUrl = "";
    attachError = "";
  }
</script>

{#if owner}
<div class="post-note">
  <Form form={noteForm} onpaste={onPaste}>
    <div>
      <textarea
        name="noteBody"
        rows="4"
        placeholder="いまどうしてる？"
        bind:value={noteForm.data.noteBody}
        aria-invalid={noteForm.errors.noteBody === "empty_body" ? "true" : undefined}
        aria-describedby={noteForm.errors.noteBody ? "note-field-error" : undefined}
      ></textarea>
    </div>
    {#if previewUrl}
      <div class="preview">
        <img src={previewUrl} alt={imageAlt.trim()} />
        <div class="field">
          <label for="note-image-alt">代替テキスト <span aria-hidden="true">*</span></label>
          <input
            id="note-image-alt"
            name="noteImageAlt"
            type="text"
            required
            maxlength="1500"
            bind:value={imageAlt}
            bind:this={altInput}
            aria-invalid={altError || noteForm.errors.noteImageAlt ? "true" : undefined}
            aria-describedby={altError || noteForm.errors.noteImageAlt
              ? "note-image-alt-hint note-image-alt-error"
              : "note-image-alt-hint"}
            oninput={onAltInput}
          />
          <p id="note-image-alt-hint">画像があるときは必須です</p>
          {#if altError || noteForm.errors.noteImageAlt}
            <p id="note-image-alt-error" role="alert">
              {noteFieldError(altError || noteForm.errors.noteImageAlt)}
            </p>
          {/if}
        </div>
        <button type="button" onclick={removeImage}>外す</button>
      </div>
    {/if}
    {#if attachError}
      <p id="note-attach-error" role="alert">{noteFieldError(attachError)}</p>
    {/if}
    {#if noteForm.errors.noteBody}
      <p id="note-field-error" role="alert">{noteFieldError(noteForm.errors.noteBody)}</p>
    {/if}
    <div class="actions">
      <input
        id="note-image"
        class="visually-hidden"
        type="file"
        name="noteImage"
        accept="image/jpeg,image/png,image/gif,image/webp"
        aria-invalid={attachError ? "true" : undefined}
        aria-describedby={attachError ? "note-attach-error" : undefined}
        bind:this={fileInput}
        onchange={onFile}
      />
      <label for="note-image">画像を添付</label>
      <button type="submit" disabled={noteForm.pending}>投稿</button>
    </div>
  </Form>
</div>
{/if}

<h1>weblog.yamanoku.net</h1>


{#each entries as entry (entry.id)}
  <article>
    <Link href={entry.href}>{entry.title}</Link>
    {#if entry.kind === "article"}
      {@html markdownToHtml(entry.body)}
    {:else}
      <p style="white-space: pre-wrap">{entry.body}</p>
    {/if}
    {#if entry.kind === "note" && entry.imageHref}
      <img src={entry.imageHref} alt={entry.imageAlt ?? ""} />
    {/if}
    <Link href={`/e/${entry.id}`}>permalink</Link>
    <time datetime={entry.publishedAt}>{entry.publishedAt}</time>
  </article>
{/each}

<style scoped >
  .post-note {
    margin-block-start: var(--y-rhythm-2);
  }
  .post-note textarea,
  .post-note button,
  .post-note label,
  .post-note input[type="text"] {
    font: inherit;
    font-size: max(1rem, 1em);
  }
  .post-note textarea {
    width: 100%;
    min-height: 100px;
    padding: var(--y-rhythm-1);
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  .post-note .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--y-rhythm-1);
    margin-block-start: var(--y-rhythm-1);
  }
  .post-note button,
  .post-note label[for="note-image"] {
    min-height: 48px;
    padding: var(--y-rhythm-1);
    box-sizing: border-box;
  }
  .post-note label[for="note-image"] {
    display: inline-flex;
    align-items: center;
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  .post-note .field {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    width: 100%;
  }
  .post-note input[type="text"] {
    width: 100%;
    min-height: 48px;
    padding: var(--y-rhythm-1);
    box-sizing: border-box;
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  .post-note input:focus-visible + label,
  .post-note button:focus-visible,
  .post-note textarea:focus-visible,
  .post-note input[type="text"]:focus-visible {
    outline: 3px solid var(--y-black-base, #111);
    outline-offset: 2px;
  }
  .preview img,
  article img {
    max-width: 100%;
    height: auto;
  }
  .preview {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--y-rhythm-1);
    margin-block-start: var(--y-rhythm-1);
  }
  .visually-hidden {
    position: absolute;
    clip-path: inset(50%);
    overflow: hidden;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    white-space: nowrap;
  }
</style>