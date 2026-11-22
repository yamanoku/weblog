<script lang="ts">
  import { Link } from "@void/svelte";
  import Breadcrumb from "../../ui/breadcrumb.svelte";
</script>

<svelte:head>
  <title>ログイン - weblog.yamanoku.net</title>
</svelte:head>

<Breadcrumb items={[
  { href: "/", label: "トップ" },
  { href: "/login", label: "ログイン", current: true },
]} />

<p><Link class="dads-link" href="/edit">編集</Link></p>
<p><Link class="dads-link" href="/new">新規</Link></p>
