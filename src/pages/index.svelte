<script lang="ts">
  import type { CalendarDay } from "../domain/home-calendar.ts";

  let {
    documentTitle = "weblog.yamanoku.net",
    label = "",
    previousHref = "/",
    nextHref = "/",
    weeks = [] as Array<Array<CalendarDay | null>>,
  } = $props();

</script>

<svelte:head>
  <title>{documentTitle}</title>
</svelte:head>

<div class="dads-heading" data-size="32">
  <h1 class="dads-heading__heading">
    <span class="subdomain">weblog.</span><span class="domain">yamanoku.net</span>
  </h1>
</div>

<div class="dads-heading" data-size="24">
  <h2 id="month-label" class="dads-heading__heading">{label}</h2>
</div>
<nav class="month-nav" aria-label="月">
  <a class="dads-link" href={previousHref}>前の月</a>
  <a class="dads-link" href={nextHref}>次の月</a>
</nav>
<div class="dads-table">
  <table class="dads-table__table" data-width="full" data-cell-border>
    <caption class="dads-u-visually-hidden">{label}</caption>
    <thead>
      <tr>
        <th class="dads-table__col-header" scope="col">日</th>
        <th class="dads-table__col-header" scope="col">月</th>
        <th class="dads-table__col-header" scope="col">火</th>
        <th class="dads-table__col-header" scope="col">水</th>
        <th class="dads-table__col-header" scope="col">木</th>
        <th class="dads-table__col-header" scope="col">金</th>
        <th class="dads-table__col-header" scope="col">土</th>
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
</div>

<style>
  h1 {
    display: inline-flex;
    flex-wrap: wrap;
  }
  h1 span {
    overflow-wrap: anywhere;
  }

  .month-nav {
    display: flex;
    justify-content: space-between;
  }
</style>
