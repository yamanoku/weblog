<script lang="ts">
  import { Link } from "@void/svelte";
  import { markdownToHtml } from "../../domain/markdown-html.ts";
  import Breadcrumb from "../../ui/breadcrumb.svelte";
  import EntryHeading from "../../ui/entry-heading.svelte";

  let { entry = null, thread = null, owner = false, refused = null, headTitle = "weblog.yamanoku.net" } = $props();
</script>

<svelte:head>
  <title>{headTitle}</title>
</svelte:head>

{#if thread}
  <Breadcrumb items={[
    { href: "/", label: "トップ" },
    { href: `/e/${thread[0]?.id ?? ""}`, label: "permalink", current: true },
  ]} />
  {#if owner && refused === "empty_body"}
    <p class="dads-textarea__error-text" role="alert">本文が空です</p>
  {/if}
  {#each thread as note (note.id)}
    <article class="entry-article" id="note-{note.id}">
      <p class="entry-body" style="white-space: pre-wrap">{note.body}</p>
      {#if note.imageHref}
        <img src={note.imageHref} alt={note.imageAlt ?? ""} />
      {/if}
      <p><Link class="dads-link" href={`/e/${note.id}`}>permalink</Link></p>
      {#if owner}
      <details class="dads-disclosure">
        <summary class="dads-disclosure__summary">
          <svg class="dads-disclosure__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="currentcolor"/>
            <circle class="dads-disclosure__icon-circle" cx="12" cy="12" r="8" fill="currentcolor"/>
            <path class="dads-disclosure__icon-triangle" d="M17 10H7L12 15L17 10Z" fill="Canvas"/>
          </svg>
          返信する
        </summary>
        <div class="dads-disclosure__content">
          <form class="form-stack" method="post" action="/edit?reply">
            <input type="hidden" name="replyTo" value={note.id} />
            <div class="dads-form-control-label" data-size="md">
              <label class="dads-form-control-label__label" for="reply-{note.id}">返信</label>
              <div class="dads-form-control-label__field">
                <span class="dads-textarea">
                  <textarea id="reply-{note.id}" class="dads-textarea__textarea" name="noteBody" rows="4"></textarea>
                </span>
              </div>
            </div>
            <button class="dads-button" data-size="md" data-type="solid-fill" type="submit">返信</button>
          </form>
        </div>
      </details>
      {/if}
    </article>
  {/each}
{:else if entry}
  <Breadcrumb items={[
    { href: "/", label: "トップ" },
    { href: `/e/${entry.id}`, label: entry.title || "permalink", current: true },
  ]} />
  <article class="entry-article">
    <EntryHeading
      title={entry.title}
      bookmarkUrl={entry.kind === "bookmark" ? entry.bookmarkUrl : null}
    />
    {#if entry.kind === "note"}
      <p class="entry-body" style="white-space: pre-wrap">{entry.body}</p>
    {:else}
      <div class="entry-body">
        {@html markdownToHtml(entry.body, entry.gyazo ?? {})}
      </div>
      {#if entry.kind === "bookmark"}
        {#each entry.images ?? [] as image (image.href)}
          <img src={image.href} alt={image.alt} />
        {/each}
      {/if}
    {/if}
  </article>
  {#if owner && (entry.kind === "article" || entry.kind === "bookmark")}
    <p><Link class="dads-link" href={`/edit/${entry.id}`}>edit</Link></p>
  {/if}
{:else}
  <p>No entry for this URL.</p>
{/if}
