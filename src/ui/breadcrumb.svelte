<script lang="ts">
  import { Link } from "@void/svelte";

  let { items }: { items: { href: string; label: string; current?: boolean }[] } = $props();
</script>

<nav class="dads-breadcrumb" aria-label="パンくず">
  <ol class="dads-breadcrumb__list">
    {#each items as item, index (item.href)}
      <li class="dads-breadcrumb__item">
        <Link
          class="dads-link dads-breadcrumb__link"
          href={item.href}
          aria-current={item.current ? "page" : undefined}
        >{item.label}</Link>
        {#if index < items.length - 1}
          <span class="dads-breadcrumb__separator" aria-hidden="true">
            <svg class="dads-breadcrumb__separator-icon" width="12" height="12" viewBox="0 0 12 12">
              <path d="M4.5 11L4 10.5L8 6.5L4 2.5L4.5 2L9 6.5L4.5 11Z" fill="currentcolor" />
            </svg>
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
