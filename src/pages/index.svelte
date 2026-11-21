<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";
  import { groupByUpdatedDay } from "../domain/published-day.ts";
  import { acceptNoteImage, encodeNoteImage, noteImageAltLimit } from "../domain/note-image.ts";

  let { entries, owner = false, postedNote = null } = $props();
  const dayGroups = $derived(groupByUpdatedDay(entries));
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

<div class="dads-heading" data-size="32">
  <h1 class="dads-heading__heading">
    <span class="subdomain">weblog.</span><span class="domain">yamanoku.net</span>
  </h1>
</div>

{#if owner}
<div class="post-note">
  <Form form={noteForm} onpaste={onPaste} aria-labelledby="note-label">
    <div class="form-stack">
      <div class="dads-form-control-label" data-size="md">
        <label id="note-label" class="dads-form-control-label__label" for="note-body">いまどうしてる？</label>
        <div class="dads-form-control-label__field">
          <span class="dads-textarea">
            <textarea
              id="note-body"
              class="dads-textarea__textarea"
              name="noteBody"
              rows="4"
              bind:value={noteForm.data.noteBody}
              aria-invalid={noteForm.errors.noteBody === "empty_body" ? "true" : undefined}
              aria-describedby={noteForm.errors.noteBody ? "note-field-error" : undefined}
            ></textarea>
            {#if noteForm.errors.noteBody}
              <span id="note-field-error" class="dads-textarea__error-text" role="alert">{noteFieldError(noteForm.errors.noteBody)}</span>
            {/if}
          </span>
        </div>
      </div>
      {#if previewUrl}
        <div class="preview">
          <img src={previewUrl} alt={imageAlt.trim()} />
          <div class="dads-form-control-label" data-size="md">
            <label class="dads-form-control-label__label" for="note-image-alt">
              代替テキスト
              <span class="dads-form-control-label__requirement" data-required="true">※必須</span>
            </label>
            <p id="note-image-alt-hint" class="dads-form-control-label__support-text">画像があるときは必須です</p>
            <div class="dads-form-control-label__field">
              <span class="dads-input-text">
                <input
                  id="note-image-alt"
                  class="dads-input-text__input"
                  name="noteImageAlt"
                  type="text"
                  data-size="md"
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
                {#if altError || noteForm.errors.noteImageAlt}
                  <span id="note-image-alt-error" class="dads-input-text__error-text" role="alert">
                    {noteFieldError(altError || noteForm.errors.noteImageAlt)}
                  </span>
                {/if}
              </span>
            </div>
          </div>
          <button class="dads-button" data-size="md" data-type="outline" type="button" onclick={removeImage}>外す</button>
        </div>
      {/if}
      {#if attachError}
        <p id="note-attach-error" class="dads-input-text__error-text" role="alert">{noteFieldError(attachError)}</p>
      {/if}
      <div class="button-row">
        <input
          id="note-image"
          class="dads-u-visually-hidden"
          type="file"
          name="noteImage"
          accept="image/jpeg,image/png,image/gif,image/webp"
          aria-invalid={attachError ? "true" : undefined}
          aria-describedby={attachError ? "note-attach-error" : undefined}
          bind:this={fileInput}
          onchange={onFile}
        />
        <label class="dads-button" data-size="md" data-type="outline" for="note-image">画像を添付</label>
        <button class="dads-button" data-size="md" data-type="solid-fill" type="submit" disabled={noteForm.pending}>投稿</button>
      </div>
    </div>
  </Form>
</div>
{/if}

{#each dayGroups as group (group.date || group.entries[0].id)}
  <section class="entry-list">
    {#if group.date}
      <h2 class="entry-list__heading">
        <time class="entry-list__date" datetime={group.date}>{group.label}</time>
      </h2>
    {/if}
    {#each group.entries as entry (entry.id)}
      <article class="entry-list">
        <p class="dads-u-std-18B-160">
          {entry.title}
        </p>
        {#if entry.kind === "note"}
          <p class="entry-body" style="white-space: pre-wrap">{entry.body}</p>
          {#if entry.imageHref}
            <img src={entry.imageHref} alt={entry.imageAlt ?? ""} />
          {/if}
        {:else}
          <div class="entry-body">
            {@html markdownToHtml(entry.body)}
          </div>
          {#if entry.kind === "bookmark"}
            {#each entry.images ?? [] as image (image.href)}
              <img src={image.href} alt={image.alt} />
            {/each}
          {/if}
        {/if}
        <p><Link class="dads-link" href={`/e/${entry.id}`}>permalink</Link></p>
      </article>
    {/each}
  </section>
{/each}

<style>
  h1 {
    display: inline-flex;
    flex-wrap: wrap;
  }
  h1 span {
    overflow-wrap: anywhere;
  }

  .entry-list__heading {
    border-top: 1px solid var(--color-neutral-solid-gray-200);
    margin-block: 0.5lh;
    display: flex;
    height: 0;
    align-items: center;
    justify-content: center;
    z-index: 1;
    pointer-events: none;
  }

  .entry-list__date {
    display: block;
    flex: 0 0 auto;
    font-weight: normal;
    font-size: 0.875rem;
    margin-block-start: -0.25lh;
    padding-inline: 0.5lh;
    background-color: white;
    pointer-events: none;
  }
</style>
