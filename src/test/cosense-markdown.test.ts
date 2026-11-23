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
  assert.match(markdown, /^- \[Luma AI\]\(\/Luma_AI\)\n {2}- \[子ページ\]\(\/%E5%AD%90%E3%83%9A%E3%83%BC%E3%82%B8\)/m);
  assert.match(markdown, /\[GitHub\.icon\] \[https:\/\/github\.com\/yamanoku\/yamanoku-icons\]\(https:\/\/github\.com\/yamanoku\/yamanoku-icons\)/);
  assert.match(markdown, /\[2016\]\(\/2016\) 年にリメイクした/);
  assert.match(markdown, /\[https:\/\/gyazo\.com\/809a6f523937838d9ba5eaf20717feee\]/);
  assert.match(markdown, /!\[\]\(https:\/\/example\.com\/pixel\.png\)/);
  assert.match(markdown, /^- \[DLSS 5 Anything\]\(https:\/\/huggingface\.co\/spaces\/victor\/dlss-5-anything\)/m);
  assert.match(markdown, /^> 引用です/m);
  assert.match(markdown, /\*\*強調\*\*/);
  assert.match(markdown, /\*斜体\*/);
  assert.match(markdown, /~~打ち消し~~/);
  assert.match(markdown, /\*\*大きい\*\*/);
  assert.match(markdown, /\*\*もっと大きな文字\*\*/);
  assert.match(markdown, /\[\$ \\frac\{1\}\{2\}\]/);
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
