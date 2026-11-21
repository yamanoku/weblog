<script lang="ts">
  import { onMount } from "svelte";
  import { Link } from "@void/svelte";
  import "yama-normalize";
  import "../styles/dads/global.css";
  import "../styles/dads/heading.css";
  import "../styles/dads/link.css";
  import "../styles/dads/button.css";
  import "../styles/dads/list.css";
  import "../styles/dads/divider.css";
  import "../styles/dads/horizontal-menu.css";
  import "../styles/dads/input-text.css";
  import "../styles/dads/textarea.css";
  import "../styles/dads/form-control-label.css";
  import "../styles/dads/select.css";
  import "../styles/dads/breadcrumb.css";
  import "../styles/dads/disclosure.css";
  import "../styles/dads/utility-link.css";
  import "../styles/site.css";

  let { children } = $props();

  const year = new Date().getFullYear();
  let pathname = $state("");

  onMount(() => {
    const sync = () => {
      pathname = window.location.pathname;
    };
    const onClick = () => queueMicrotask(sync);
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("click", onClick);
    };
  });

  function here(href: string): "page" | undefined {
    if (pathname === "") return undefined;
    if (href === "/") return pathname === "/" ? "page" : undefined;
    return pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined;
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+Mono:wght@400;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<header>
  <p class="site-brand">
    <svg width="48" height="48" viewBox="0 0 246 242" role="img" aria-label="yamanoku">
      <path fill-rule="evenodd" transform="translate(-64 -67)" d="M64,67v54l82,82-46,46v60h56L310,155V96H230l-21,20L160,67H64ZM176,203l-45,46h25L293,113H230l-39,39-31-31H94Z"></path>
    </svg>
    <span>ウェブログ</span>
  </p>
  <nav class="site-nav" aria-label="サイト">
    <ul class="dads-horizontal-menu">
      <li class="dads-horizontal-menu__item">
        <Link class="dads-horizontal-menu__item-inner" href="/" aria-current={here("/")}>トップ</Link>
      </li>
      <li class="dads-horizontal-menu__item">
        <Link class="dads-horizontal-menu__item-inner" href="/edit" aria-current={here("/edit")}>編集</Link>
      </li>
    </ul>
  </nav>
</header>

<main class="site-main">
  {@render children()}
</main>

<footer class="site-footer">
  <p>© Copyright {year}, Okuto Oyama</p>
  <p>
    Source:
    <a class="dads-utility-link" href="https://github.com/yamanoku/weblog" target="_blank" rel="noopener noreferrer">
      <span class="dads-utility-link__label">yamanoku/weblog</span>
      <svg class="dads-utility-link__tail-icon" width="16" height="16" viewBox="0 0 48 48" fill="currentcolor" role="img" aria-label="新規タブで開きます">
        <path d="M22 6V9H9V39H39V26H42V42H6V6H22ZM42 6V20H39V11.2L21 29L19 27L36.8 9H28V6H42Z" />
      </svg>
    </a>
  </p>
</footer>
