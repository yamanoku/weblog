<script lang="ts">
  import { Link } from "@void/svelte";
  import "yama-normalize";

  let { children } = $props();

  const date = new Date();
  const year = date.getFullYear();
</script>

<header>
  <div class="site-header-logo">
    <svg width="48" height="48" viewBox="0 0 246 242" role="img" aria-label="yamanoku">
      <path class="site-logo" fill-rule="evenodd" transform="translate(-64 -67)" d="M64,67v54l82,82-46,46v60h56L310,155V96H230l-21,20L160,67H64ZM176,203l-45,46h25L293,113H230l-39,39-31-31H94Z"></path>
    </svg>
    <span>ウェブログ</span>
  </div>
  <nav class="site-header-nav">
    <Link href="/">トップ</Link>
    <Link href="/pages">公開記事一覧</Link>
    <Link href="/edit">編集</Link>
  </nav>
</header>

<main>
  {@render children()}
</main>

<footer>
  <p>© Copyright {year}, Okuto Oyama</p>
  <p>
    Source: <a href="https://github.com/yamanoku/weblog">yamanoku/weblog</a>
  </p>
</footer>

<style>
  .site-header-logo {
    display: inline-flex;
    align-items: center;
    gap: var(--y-rhythm-1);
    margin-block: var(--y-rhythm-2);
  }
  .site-logo {
    fill: var(--y-identity-color);
  }

  .site-header-nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--y-rhythm-1);
  }
</style>