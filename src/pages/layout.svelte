<script lang="ts">
  import { Link } from "@void/svelte";

  let { children } = $props();
</script>

<nav>
  <Link href="/">Home</Link>
  <Link href="/pages">Titles</Link>
  <Link href="/edit">Edit</Link>
</nav>
{@render children()}
