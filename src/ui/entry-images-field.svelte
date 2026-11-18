<script lang="ts">
  import { entryImageMarkdown } from "../domain/entry-image.ts";
  import { acceptNoteImage, encodeNoteImage, noteImageAltLimit } from "../domain/note-image.ts";

  type Item = {
    id: string;
    alt: string;
    previewUrl: string;
    base64: string;
    stored: boolean;
  };

  let {
    initial = [],
    inputId,
    getBody,
    setBody,
    getTextarea,
    register,
    serverCode = "",
  } = $props();

  let items = $state<Item[]>(
    initial.map((image: { id: string; alt: string }) => ({
      id: image.id,
      alt: image.alt,
      previewUrl: `/edit/images/${image.id}`,
      base64: "",
      stored: true,
    })),
  );
  let attachError = $state("");
  let fileInput = $state<HTMLInputElement | null>(null);
  const altInputs = new Map<string, HTMLInputElement>();

  function payload() {
    return items.map((item) => ({
      id: item.id,
      alt: item.alt.trim(),
      ...(item.stored ? {} : { data: item.base64 }),
    }));
  }

  function overLimit(alt: string): boolean {
    return [...alt.trim()].length > noteImageAltLimit;
  }

  function refuse(): boolean {
    const item = items.find((candidate) => overLimit(candidate.alt));
    if (!item) return false;
    altInputs.get(item.id)?.focus();
    return true;
  }

  function markStored() {
    for (const item of items) {
      if (!item.stored && item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      item.stored = true;
      item.base64 = "";
      item.previewUrl = `/edit/images/${item.id}`;
    }
  }

  async function addFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const accepted = acceptNoteImage(bytes);
    if ("error" in accepted) {
      attachError = accepted.error;
      fileInput?.focus();
      return;
    }
    attachError = "";
    items.push({
      id: crypto.randomUUID(),
      alt: "",
      previewUrl: URL.createObjectURL(file),
      base64: encodeNoteImage(bytes),
      stored: false,
    });
  }

  function onFile(event: Event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const files = [...(input.files ?? [])];
    input.value = "";
    for (const file of files) void addFile(file);
  }

  function onPaste(event: ClipboardEvent) {
    const files = [...(event.clipboardData?.items ?? [])].flatMap((item) => {
      if (item.kind !== "file" || !item.type.startsWith("image/")) return [];
      const file = item.getAsFile();
      return file ? [file] : [];
    });
    if (files.length === 0) return;
    event.preventDefault();
    for (const file of files) void addFile(file);
  }

  function removeImage(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (item && !item.stored && item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    items = items.filter((candidate) => candidate.id !== id);
    altInputs.delete(id);
  }

  function insertImage(item: Item) {
    const markdown = entryImageMarkdown(item.alt.trim(), item.id);
    const body = getBody();
    const area = getTextarea();
    const start = area?.selectionStart ?? body.length;
    const end = area?.selectionEnd ?? start;
    setBody(`${body.slice(0, start)}${markdown}${body.slice(end)}`);
    queueMicrotask(() => {
      const next = getTextarea();
      if (!next) return;
      next.focus();
      const cursor = start + markdown.length;
      next.selectionStart = cursor;
      next.selectionEnd = cursor;
    });
  }

  function bindAlt(node: HTMLInputElement, id: string) {
    altInputs.set(id, node);
    return {
      destroy() {
        altInputs.delete(id);
      },
    };
  }

  $effect(() => {
    for (const item of items) {
      const input = altInputs.get(item.id);
      if (!input) continue;
      input.setCustomValidity(overLimit(item.alt) ? "代替テキストは 1500 字までです" : "");
    }
  });

  function fieldError(code: string): string {
    if (code === "image_type") return "JPEG、PNG、GIF、WebP の画像だけ添付できます";
    if (code === "image_too_large") return "画像は 8 MiB までです";
    if (code === "image_alt_length") return "代替テキストは 1500 字までです";
    return "投稿できませんでした";
  }

  register({ payload, refuse, markStored, onPaste });
</script>

{#each items as item (item.id)}
  <div class="preview">
    <img src={item.previewUrl} alt={item.alt.trim()} />
    <div class="field">
      <label for="{inputId}-alt-{item.id}">代替テキスト</label>
      <input
        id="{inputId}-alt-{item.id}"
        type="text"
        maxlength="1500"
        bind:value={item.alt}
        use:bindAlt={item.id}
        aria-invalid={overLimit(item.alt) || serverCode === "image_alt_length" ? "true" : undefined}
        aria-describedby={overLimit(item.alt)
          ? `${inputId}-hint-${item.id} ${inputId}-alt-error-${item.id}`
          : `${inputId}-hint-${item.id}`}
      />
      <p id="{inputId}-hint-{item.id}">空欄のままでも保存できます</p>
      {#if overLimit(item.alt)}
        <p id="{inputId}-alt-error-{item.id}" role="alert">代替テキストは 1500 字までです</p>
      {/if}
    </div>
    <button type="button" onclick={() => insertImage(item)}>本文に入れる</button>
    <button type="button" onclick={() => removeImage(item.id)}>外す</button>
  </div>
{/each}
{#if attachError || (serverCode && serverCode !== "image_alt_length")}
  <p id="{inputId}-error" role="alert">{fieldError(attachError || serverCode)}</p>
{/if}
<input
  id={inputId}
  class="visually-hidden"
  type="file"
  name="entryImage"
  accept="image/jpeg,image/png,image/gif,image/webp"
  multiple
  aria-invalid={attachError ? "true" : undefined}
  aria-describedby={attachError ? `${inputId}-error` : undefined}
  bind:this={fileInput}
  onchange={onFile}
/>
<label class="attach" for={inputId}>画像を添付</label>

<style scoped>
  .preview {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--y-rhythm-1);
    margin-block-start: var(--y-rhythm-1);
  }
  img {
    max-width: 100%;
    height: auto;
  }
  .field {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    width: 100%;
  }
  button,
  label,
  input[type="text"] {
    font: inherit;
    font-size: max(1rem, 1em);
  }
  button,
  label.attach,
  input[type="text"] {
    min-height: 48px;
    padding: var(--y-rhythm-1);
    box-sizing: border-box;
  }
  label.attach {
    display: inline-flex;
    align-items: center;
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  input[type="text"] {
    width: 100%;
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  button:focus-visible,
  label.attach:focus-visible,
  input[type="text"]:focus-visible,
  input:focus-visible + label.attach {
    outline: 3px solid var(--y-black-base, #111);
    outline-offset: 2px;
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
