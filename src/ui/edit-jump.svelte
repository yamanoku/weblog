<script lang="ts">
  import { useRouter } from "@void/svelte";

  let {
    id,
    heading,
    empty,
    items,
    path,
    deleteAction = "",
    deleteName = "",
  }: {
    id: string;
    heading: string;
    empty: string;
    items: { id: string; label: string }[];
    path: (id: string) => string;
    deleteAction?: string;
    deleteName?: string;
  } = $props();

  const router = useRouter();
  const headingId = $derived(`${id}-heading`);
  let choice = $state("");
  const selected = $derived(
    items.some((item) => item.id === choice) ? choice : (items[0]?.id ?? ""),
  );

  function go(event: SubmitEvent) {
    const href = path(selected);
    if (!href || typeof router.visit !== "function") return;
    event.preventDefault();
    void router.visit(href);
  }
</script>

<div>
  <div class="dads-heading" data-size="24">
    <h2 class="dads-heading__heading" id={headingId}>
      {#if items.length > 0}
        <label for={id}>{heading}</label>
      {:else}
        {heading}
      {/if}
    </h2>
  </div>
  {#if items.length === 0}
    <p>{empty}</p>
  {:else}
    <div class="edit-jump">
      <form class="edit-jump__go" method="get" action={path(selected)} aria-labelledby={headingId} onsubmit={go}>
        <span class="edit-jump__pick dads-select">
          <span class="dads-select__control">
            <select
              {id}
              class="dads-select__select"
              data-size="md"
              value={selected}
              onchange={(event) => {
                const target = event.currentTarget;
                if (target instanceof HTMLSelectElement) choice = target.value;
              }}
            >
              {#each items as item (item.id)}
                <option value={item.id}>{item.label}</option>
              {/each}
            </select>
            <svg class="dads-select__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17L3 8L4 7L12 15L20 7L21 8L12 17Z" fill="currentcolor"/>
            </svg>
          </span>
        </span>
        <button class="dads-button" data-size="md" data-type="solid-fill" type="submit">移動</button>
      </form>
      {#if deleteAction && deleteName}
        <form method="post" action={deleteAction} aria-labelledby={headingId}>
          <input type="hidden" name={deleteName} value={selected} />
          <button class="dads-button" data-size="md" data-type="outline" type="submit">Delete</button>
        </form>
      {/if}
    </div>
  {/if}
</div>

<style>
  h2 label {
    font: inherit;
    letter-spacing: inherit;
    cursor: pointer;
  }

  .edit-jump {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .edit-jump__go {
    display: flex;
    flex: 1 1 18rem;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    min-inline-size: min(100%, 18rem);
  }

  .edit-jump__pick {
    flex: 1 1 12rem;
    min-inline-size: min(100%, 12rem);
  }

  .edit-jump__pick,
  .edit-jump__pick :global(.dads-select__control) {
    width: 100%;
    max-inline-size: none;
  }
</style>
