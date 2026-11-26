<script lang="ts">
  import { Form, useForm } from "@void/svelte";
  import { acceptNoteImage, encodeNoteImage, noteImageAltLimit } from "../domain/note-image.ts";
  import type { CalendarDay } from "../domain/home-calendar.ts";

  let {
    owner = false,
    postedNote = null,
    documentTitle = "weblog.yamanoku.net",
    label = "",
    previousHref = "/",
    nextHref = "/",
    weeks = [] as Array<Array<CalendarDay | null>>,
  } = $props();
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

<svelte:head>
  <title>{documentTitle}</title>
</svelte:head>

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

<div class="dads-heading" data-size="24">
  <h2 id="month-label" class="dads-heading__heading">{label}</h2>
</div>
<nav class="month-nav" aria-label="月">
  <a class="dads-link" href={previousHref}>前の月</a>
  <a class="dads-link" href={nextHref}>次の月</a>
</nav>
<table class="month-calendar">
  <caption class="dads-u-visually-hidden">{label}</caption>
  <thead>
    <tr>
      <th scope="col">日</th>
      <th scope="col">月</th>
      <th scope="col">火</th>
      <th scope="col">水</th>
      <th scope="col">木</th>
      <th scope="col">金</th>
      <th scope="col">土</th>
    </tr>
  </thead>
  <tbody>
    {#each weeks as week, weekIndex (weekIndex)}
      <tr>
        {#each week as cell, dayIndex (`${weekIndex}-${cell?.date ?? dayIndex}`)}
          <td>
            {#if cell}
              {#if cell.href}
                <a class="dads-link" href={cell.href} aria-label={cell.accessibleName} aria-current={cell.current ? "date" : undefined}>{cell.day}</a>
              {:else}
                <time datetime={cell.date} aria-current={cell.current ? "date" : undefined}>{cell.day}</time>
              {/if}
            {/if}
          </td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>

<style>
  h1 {
    display: inline-flex;
    flex-wrap: wrap;
  }
  h1 span {
    overflow-wrap: anywhere;
  }

  .post-note {
    max-inline-size: 40rem;
  }

  .month-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    margin-block: 0.5rem 1rem;
  }

  .month-calendar {
    width: 100%;
    max-inline-size: 40rem;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .month-calendar th,
  .month-calendar td {
    padding: 0.25rem;
    text-align: center;
    vertical-align: middle;
  }

  .month-calendar a,
  .month-calendar time {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 2.75rem;
    min-block-size: 2.75rem;
  }

  .month-calendar [aria-current="date"] {
    font-weight: 700;
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  @media (forced-colors: active) {
    .month-calendar [aria-current="date"] {
      outline-color: CanvasText;
    }
  }
</style>
