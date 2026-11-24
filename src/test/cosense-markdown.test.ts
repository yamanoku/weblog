import assert from "node:assert/strict";
import { test } from "vitest";
import { cosenseTextToMarkdown } from "../domain/cosense-markdown.ts";
import { markdownToHtml } from "../domain/markdown-html.ts";

test("cosense text becomes markdown with host links, lists, code, and tables", () => {
  const source = [
    "yamanoku",
    "\t[Luma AI]",
    "\t\t[子ページ]",
    "[GitHub.icon] https://github.com/yamanoku/yamanoku-icons",
    "#2016 年にリメイクした",
    "[https://gyazo.com/809a6f523937838d9ba5eaf20717feee]",
    "[https://example.com/pixel.png]",
    "\t[https://huggingface.co/spaces/victor/dlss-5-anything DLSS 5 Anything]",
    "> 引用です",
    "[* 強調] [/ 斜体] [- 打ち消し] [[大きい]] [**** もっと大きな文字]",
    "[$ \\frac{1}{2}]",
    "code:hello.js",
    " function () {",
    "\tconsole.log('hi')",
    "",
    "table:表の例",
    "\tabc\tdef",
    "\t123\t456",
  ].join("\n");

  const markdown = cosenseTextToMarkdown(source);
  assert.match(markdown, /^yamanoku\n/);
  const dated = cosenseTextToMarkdown("2025-01-01\n\n- [誕生日]\n2024-10-30 は残る");
  assert.equal(dated.startsWith("- [誕生日]"), true);
  assert.match(dated, /2024-10-30 は残る/);
  assert.equal(dated.includes("2025-01-01"), false);
  assert.match(markdown, /^- \[Luma AI\]\(\/Luma_AI\)\n {2}- \[子ページ\]\(\/%E5%AD%90%E3%83%9A%E3%83%BC%E3%82%B8\)/m);
  assert.match(markdown, /\[GitHub\.icon\] \[https:\/\/github\.com\/yamanoku\/yamanoku-icons\]\(https:\/\/github\.com\/yamanoku\/yamanoku-icons\)/);
  assert.match(markdown, /\[2016\]\(\/2016\) 年にリメイクした/);
  assert.match(markdown, /\[https:\/\/gyazo\.com\/809a6f523937838d9ba5eaf20717feee\]/);
  const doubled = cosenseTextToMarkdown(
    [
      "[[https://gyazo.com/c4de38b02edf21030042353143b4f762]]",
      "[[https://i.gyazo.com/abc.png]]",
      "[[ https://gyazo.com/spaced ]]",
      "[[https://scrapbox.io/files/x.png]]",
      "[[大きい画像]]",
      "code:",
      " [[https://gyazo.com/abc]]",
    ].join("\n"),
  );
  assert.equal(doubled.includes("[[https://gyazo.com/c4de38b02edf21030042353143b4f762]]"), false);
  assert.match(doubled, /^\[https:\/\/gyazo\.com\/c4de38b02edf21030042353143b4f762\]$/m);
  assert.match(doubled, /^\[https:\/\/i\.gyazo\.com\/abc\.png\]$/m);
  assert.match(doubled, /^\[https:\/\/gyazo\.com\/spaced\]$/m);
  assert.match(doubled, /^\[\[https:\/\/scrapbox\.io\/files\/x\.png\]\]$/m);
  assert.match(doubled, /\*\*大きい画像\*\*/);
  assert.match(doubled, /\[\[https:\/\/gyazo\.com\/abc\]\]/);
  assert.equal(
    cosenseTextToMarkdown("[https://gyazo.com/c4de38b02edf21030042353143b4f762]"),
    "[https://gyazo.com/c4de38b02edf21030042353143b4f762]",
  );
  assert.match(markdown, /!\[\]\(https:\/\/example\.com\/pixel\.png\)/);
  assert.match(markdown, /^- \[DLSS 5 Anything\]\(https:\/\/huggingface\.co\/spaces\/victor\/dlss-5-anything\)/m);
  assert.match(markdown, /^> 引用です/m);
  assert.match(markdown, /\*\*強調\*\*/);
  assert.match(markdown, /\*斜体\*/);
  assert.match(markdown, /~~打ち消し~~/);
  assert.match(markdown, /\*\*大きい\*\*/);
  assert.match(markdown, /\*\*もっと大きな文字\*\*/);
  assert.match(markdown, /\[\$ \\frac\{1\}\{2\}\]/);
  const other = cosenseTextToMarkdown('[/useful-gyazo/その"ツイート"冷笑が止まりませんね笑]\n[/useful-gyazo]\n[/ text]');
  assert.match(
    other,
    /\[その"ツイート"冷笑が止まりませんね笑\]\(https:\/\/scrapbox\.io\/useful-gyazo\/%E3%81%9D%E3%81%AE%22%E3%83%84%E3%82%A4%E3%83%BC%E3%83%88%22%E5%86%B7%E7%AC%91%E3%81%8C%E6%AD%A2%E3%81%BE%E3%82%8A%E3%81%BE%E3%81%9B%E3%82%93%E3%81%AD%E7%AC%91\)/,
  );
  assert.match(other, /\[useful-gyazo\]\(https:\/\/scrapbox\.io\/useful-gyazo\)/);
  assert.match(other, /\*text\*/);
  const stored = '[/useful-gyazo/その"ツイート"冷笑が止まりませんね笑]';
  const linked = markdownToHtml(stored);
  assert.match(linked, /href="https:\/\/scrapbox\.io\/useful-gyazo\/%E3%81%9D%E3%81%AE%22/);
  assert.match(linked, />その&quot;ツイート&quot;冷笑が止まりませんね笑</);
  assert.equal(linked.includes("[/useful-gyazo/"), false);
  const coded = markdownToHtml("```\n[/useful-gyazo/page]\n```");
  assert.equal(coded.includes("<a "), false);
  assert.match(markdown, /```hello\.js\nfunction \(\) \{\nconsole\.log\('hi'\)\n```/);
  assert.match(markdown, /Table: 表の例\n\| abc \| def \|\n\| --- \| --- \|\n\| 123 \| 456 \|/);

  const html = markdownToHtml(markdown);
  assert.match(html, /<ul><li><a href="\/Luma_AI">Luma AI<\/a><ul><li><a href="\/%E5%AD%90%E3%83%9A%E3%83%BC%E3%82%B8">子ページ<\/a><\/li><\/ul><\/li><\/ul>/);
  assert.match(html, /<blockquote><p>引用です<\/p><\/blockquote>/);
  assert.match(html, /<del>打ち消し<\/del>/);
  assert.match(html, /<pre><code>function \(\) \{\nconsole\.log\('hi'\)<\/code><\/pre>/);
  assert.match(html, /<caption id="md-table-\d+">表の例<\/caption>/);
  assert.match(html, /<th scope="col">abc<\/th><th scope="col">def<\/th>/);
  assert.match(html, /<td>123<\/td><td>456<\/td>/);
  assert.match(html, /role="region" aria-labelledby="md-table-/);
});

test("a space counts as one list level and an indented quote stays in the list", () => {
  const source = [
    "day",
    "\t[誕生日]です",
    " \t[スパ]です",
    " \t\t子です",
    " 午後休です",
    "\t>[https://x.com/a @a]: 本文",
    " >#タグ",
    " \t続き",
    "    >[https://pbs.twimg.com/media/x.jpg]",
  ].join("\n");

  const markdown = cosenseTextToMarkdown(source);
  assert.equal(
    markdown,
    [
      "day",
      "",
      "- [誕生日](/%E8%AA%95%E7%94%9F%E6%97%A5)です",
      "  - [スパ](/%E3%82%B9%E3%83%91)です",
      "    - 子です",
      "- 午後休です",
      "- > [@a](https://x.com/a): 本文",
      "- > [タグ](/%E3%82%BF%E3%82%B0)",
      "  - 続き",
      "      - > ![](https://pbs.twimg.com/media/x.jpg)",
    ].join("\n"),
  );

  const html = markdownToHtml("- > one\n- > two\n  - child");
  assert.equal(
    html,
    "<ul><li><blockquote><p>one</p><p>two</p></blockquote><ul><li>child</li></ul></li></ul>",
  );
});

test("an indented code block stays inside its list item", () => {
  const source = [
    "title",
    "\t[参考]になりました",
    " \tいまだと指定になりそう",
    "  \t\tcode:ts",
    "  \t\t  {",
    "       accessorKey: 'name',",
    "       header: '発表者',",
    "       meta: {",
    "         class: {",
    "           td: 'w-full',",
    "         },",
    "       },",
    "     },",
    "",
    "\t[次]です",
    "\tcode:plain",
    "\t [page] はリンクにしない",
  ].join("\n");

  const code = [
    " {",
    "  accessorKey: 'name',",
    "  header: '発表者',",
    "  meta: {",
    "    class: {",
    "      td: 'w-full',",
    "    },",
    "  },",
    "},",
  ].join("\n");
  const markdown = cosenseTextToMarkdown(source);
  assert.match(markdown, /```ts\n/);
  assert.equal(markdown.includes("[page](/"), false);
  const html = markdownToHtml(markdown);
  assert.match(html, new RegExp(`<li><pre><code>${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</code></pre></li>`));
  assert.equal(html.includes("<li><pre><code>[page] はリンクにしない</code></pre></li>"), true);
  assert.equal(html.includes("<li>code:ts"), false);
  assert.equal(html.includes("<li>accessorKey"), false);
  assert.match(html, /<li><a href="\/%E6%AC%A1">次<\/a>です<\/li>/);
});

test("a stored list of code lines still renders as one code block", () => {
  const code = [
    " {",
    "  accessorKey: 'name',",
    "  header: '発表者',",
    "  meta: {",
    "    class: {",
    "      td: 'w-full',",
    "    },",
    "  },",
    "},",
  ].join("\n");
  const html = markdownToHtml(
    [
      "- いまだと指定になりそう",
      "      - code:ts",
      "          - {",
      "            - accessorKey: 'name',",
      "            - header: '発表者',",
      "            - meta: {",
      "                - class: {",
      "                    - td: 'w-full',",
      "                - },",
      "            - },",
      "        - },",
      "- 次",
    ].join("\n"),
  );
  assert.equal(
    html,
    `<ul><li>いまだと指定になりそう<ul><li><pre><code>${code}</code></pre></li></ul></li><li>次</li></ul>`,
  );
});

test("code:css and a spaced info string stay inside the list", () => {
  const source = [
    "day",
    "\tなるほど",
    "\t\tcode:css",
    "\t\t div.page-list {",
    "\t\t   display: none",
    "\t\t }",
    "\tcode:template strings.js",
    "\t const name = \"ada\"",
    "\u3000code:html",
    "\u3000 <p>ok</p>",
  ].join("\n");
  const html = markdownToHtml(cosenseTextToMarkdown(source));
  assert.equal(html.includes("<li><pre><code>div.page-list {\n  display: none\n}</code></pre></li>"), true);
  assert.equal(html.includes("<li><pre><code>const name = &quot;ada&quot;</code></pre></li>"), true);
  assert.equal(html.includes("<li><pre><code>&lt;p&gt;ok&lt;/p&gt;</code></pre></li>"), true);
  assert.equal(html.includes("code:css"), false);
  assert.equal(html.includes("code:html"), false);

  const stored = markdownToHtml(
    [
      "- なるほど",
      "  - code:css",
      "    - div.page-list li[data-page-title^=\"202\"](/data-page-title%5E%3D%22202%22) {",
      "      - display: none",
      "    - }",
      "  - code:template strings.js",
      "    - const name = \"ada\"",
    ].join("\n"),
  );
  const blocks = stored.match(/<pre><code>[\s\S]*?<\/code><\/pre>/g) ?? [];
  assert.equal(blocks.length, 2);
  assert.equal(blocks.some((block) => block.includes("<a ")), false);
  assert.match(blocks[0] ?? "", /display: none/);
  assert.match(blocks[1] ?? "", /const name = &quot;ada&quot;/);
});
