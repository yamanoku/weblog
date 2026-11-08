<script lang="ts">
  import { Form, Link, useForm } from "@void/svelte";
  import { markdownToHtml } from "../domain/markdown-html.ts";

  let { entries, owner = false, postedNote = null } = $props();
  const noteForm = useForm("/edit?note", { noteBody: "" }, { resetOnSuccess: true });
</script>

{#if owner}
<div class="post-note">
  <Form form={noteForm}>
    <div>
      <textarea name="noteBody" rows="4" placeholder="いまどうしてる？" bind:value={noteForm.data.noteBody}></textarea>
    </div>
    <button type="submit">投稿</button>
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
    <Link href={`/e/${entry.id}`}>permalink</Link>
    <time datetime={entry.publishedAt}>{entry.publishedAt}</time>
  </article>
{/each}

<style scoped >
  .post-note {
    margin-block-start: var(--y-rhythm-2);
  }
  .post-note textarea {
    width: 100%;
    height: 100px;
    resize: none;
    padding: var(--y-rhythm-1);
    border: 2px solid var(--y-black-base, #111);
    border-radius: var(--y-rhythm-1);
  }
  .post-note button {
    margin-block-start: var(--y-rhythm-1);
  }
</style>