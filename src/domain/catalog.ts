// Mock entries for the page map. This module does not import void, Svelte, or a store.

export type CatalogEntry = {
  id: string;
  title: string;
  kind: string;
  body: string;
  visibility: string;
  deliverable: boolean;
  publishedAt: string | null;
  updatedAt?: string | null;
  bookmarkUrl?: string;
};

export const reservedTitles = [
  "e",
  "edit",
  "entries",
  "tokens",
  "feed",
  "feed.xml",
  "feed.json",
  "users",
  "gyazo",
  "note-images",
  "new",
  "login",
  ".well-known",
  "manifest.webmanifest",
];

const reserved = new Set<string>(reservedTitles);

// Local `vp dev` sample. Newest updatedAt first. These rows set no separate updatedAt,
// so the order follows publishedAt. Tokyo noon is 03:00Z, so a day holds
// an article at 15:00 JST (06:00Z), a note at 12:00 JST (03:00Z), and a bookmark at 09:00 JST (00:00Z).
const sourceEntries: CatalogEntry[] = [
  {
    id: "entry-article-20261121",
    title: "見出しはページに一つ",
    kind: "article",
    body: `トップの見出しを画面幅で折り返したら、サブドメインとドメインの境で切れるようにしました。

## 置いた理由

見出しが一行に収まらない幅でも、\`weblog.\` と \`yamanoku.net\` が分かれて読める方がよいと思ったからです。

- 見出しレベルはページに \`h1\` を一つ
- 日付のまとまりは \`h2\`
- 記事の中の見出しは本文の Markdown に任せる

## おわりに

狭い幅でタイトルが途中で割れないかを、手元のブラウザで見てからにしています。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-21T06:00:00.000Z",
  },
  {
    id: "entry-note-20261121",
    title: "短いメモ",
    kind: "note",
    body: "ローカルのタイムラインを、英語のプレースホルダではなく日本語の本文で眺めたい。ノートはタイトルより本文の方が本体だと思っています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-21T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261121",
    title: "HTML Standard",
    kind: "bookmark",
    body: "要素の既定のロールを確認するときは、まずここの定義に戻っています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-21T00:00:00.000Z",
    bookmarkUrl: "https://html.spec.whatwg.org/",
  },
  {
    id: "entry-morning-note",
    title: "morning-note",
    kind: "article",
    body: `朝に直したのは、公開タイムラインの日付の切り方です。

保存している時刻は UTC のままです。画面では Asia/Tokyo の暦日でまとめます。2026-11-19T15:00:00.000Z は東京の 2026年11月20日です。

## 気にしていること

- 同じ日の投稿は、新しい \`updatedAt\` が上
- 同時刻なら id の降順
- フィードは日付ではまとめない

ローカルの \`vp dev\` は、このカタログの並びをそのまま出します。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-20T06:00:00.000Z",
  },
  {
    id: "entry-short-post",
    title: "short-post",
    kind: "note",
    body: "下書きのノートは公開面に出さない。本文が空の公開ノートは拒否する。空白だけの本文は、空とは別です。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-20T03:00:00.000Z",
  },
  {
    id: "entry-saved-page",
    title: "saved-page",
    kind: "bookmark",
    body: "ブックマークのタイトルは、このホストのパスではなく保存した URL を開きます。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-20T00:00:00.000Z",
    bookmarkUrl: "https://developer.mozilla.org/ja/docs/Web/HTML",
  },
  {
    id: "entry-article-20261119",
    title: "代替テキストは画像の代わりに読む",
    kind: "article",
    body: `ノートに画像を付けるときは、代替テキストを必須にしています。空の文字列や、全角スペースだけは保存しません。

## 長さ

上限は 1500 字です。超えたら \`image_alt_length\` で戻します。未入力は \`image_alt\` です。

公開ページの \`img\` の \`alt\` と、ActivityPub の Image の name は、保存したその文を使います。

## 記事とブックマーク

記事とブックマークは、代替テキストが空でも画像を複数持てます。記事の画像は Markdown に書いた位置だけに出して、本文の下には重ねません。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-19T06:00:00.000Z",
  },
  {
    id: "entry-note-20261119",
    title: "スクリーンショットの前に",
    kind: "note",
    body: "スクリーンショットを貼る前に、何が写っているかを一文で書けるかを見ています。書けない画像は、まだ説明が足りていない気がします。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-19T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261119",
    title: "WCAG 2.2",
    kind: "bookmark",
    body: "達成基準の番号で会話するときは、この一覧を開いたままにしています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-19T00:00:00.000Z",
    bookmarkUrl: "https://www.w3.org/TR/WCAG22/",
  },
  {
    id: "entry-article-20261118",
    title: "Markdownは一部だけHTMLにする",
    kind: "article",
    body: `記事とブックマークの本文は、保存した Markdown のままです。公開 HTML にするのは決めた部分集合だけです。

## 通すもの

- 空行で区切った段落
- \`#\` から \`######\` の見出し
- \`- \` と \`* \` の箇条書き
- \`*\` と \`**\`、バッククォート
- フェンスのコード
- \`[表示](URL)\` のリンク

リンクの URL は http、https、またはこのホストのパスだけです。\`javascript:\` はリンクにしません。

## 通さないもの

書いた HTML はそのまま実行しません。エスケープして文字として出します。

\`\`\`html
<p>これはコードとして出る</p>
\`\`\``,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-18T06:00:00.000Z",
  },
  {
    id: "entry-note-20261118",
    title: "コードはプレーンテキスト",
    kind: "note",
    body: "ノートは Markdown にせず、改行をそのまま出します。記事との差を、ローカルの一覧で見比べられるようにしておきたいです。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-18T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261118",
    title: "デジタル庁デザインシステム",
    kind: "bookmark",
    body: "ボタン、入力、見出しの見た目は、ここの HTML 断片を手元に写しています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-18T00:00:00.000Z",
    bookmarkUrl: "https://design.digital.go.jp/",
  },
  {
    id: "entry-article-20261117",
    title: "ローカル開発はカタログを読む",
    kind: "article",
    body: `\`vp dev\` の公開 HTML は、D1 を読みません。\`/\`、\`/{title}\`、\`/e/{id}\` は、このファイルのエントリだけを返します。

編集画面は、開発中もローカルの D1 を読みます。編集画面から保存した記事は、開発中の公開ページには出ません。

## プレビュー

\`vp preview\` とデプロイした Worker は、逆にカタログを足しません。空のテーブルは空の一覧のままです。

この並びは、公開面の密度を手元で見るためのサンプルです。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-17T06:00:00.000Z",
  },
  {
    id: "entry-note-20261117",
    title: "開発サーバを開いた",
    kind: "note",
    body: "vp dev を開くと、カタログの分だけタイムラインが埋まる想定です。保存した下書きはここには混ざりません。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-17T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261117",
    title: "Svelte",
    kind: "bookmark",
    body: "画面は Svelte です。Worker の持ち主は SvelteKit ではありません。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-17T00:00:00.000Z",
    bookmarkUrl: "https://svelte.dev/docs/svelte/overview",
  },
  {
    id: "entry-article-20261116",
    title: "AcceptでHTMLとActivity Streamsを分ける",
    kind: "article",
    body: `\`GET /e/{id}\` は一つの URL です。Activity Streams の JSON を返すのは、Accept が \`application/activity+json\` か \`application/ld+json\` を含み、\`text/html\` も \`*/*\` も含まないときだけです。

ブラウザの通常の Accept は HTML です。削除済みで、その条件を満たさないリクエストは 410 の HTML です。

## ローカル

開発中の \`/e/{id}\` はカタログの1件を HTML で返します。返信のスレッドは結びません。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-16T06:00:00.000Z",
  },
  {
    id: "entry-note-20261116",
    title: "配信はまだ送らない",
    kind: "note",
    body: "公開の article、note、bookmark は配信対象です。この画面で状態を保存しても、ActivityPub の配送そのものはまだ別の仕事です。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-16T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261116",
    title: "ActivityPub",
    kind: "bookmark",
    body: "Create の to は Public、cc は followers、という読み方をこの仕様で確認しています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-16T00:00:00.000Z",
    bookmarkUrl: "https://www.w3.org/TR/activitypub/",
  },
  {
    id: "entry-article-20261115",
    title: "編集一覧は作成時刻で並べる",
    kind: "article",
    body: `公開のホームは \`publishedAt\` の新しい順です。編集画面の記事、ノート、ブックマークは、作成時刻の新しい順で、同じ時刻なら id の降順です。

あとから本文を直しても、編集一覧の先頭には戻りません。

## 件数

オーナーの一覧は 50 件です。公開ホームのページサイズとは別です。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-15T06:00:00.000Z",
  },
  {
    id: "entry-note-20261115",
    title: "作成が先",
    kind: "note",
    body: "更新で並べると、直したメモばかり上に来ます。作った順の方が、あとから読み返すときに迷わないと思っています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-15T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261115",
    title: "weblog",
    kind: "bookmark",
    body: "このリポジトリです。仕様は docs/products/weblog/ にあります。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-15T00:00:00.000Z",
    bookmarkUrl: "https://github.com/yamanoku/weblog",
  },
  {
    id: "entry-article-20261114",
    title: "ブックマークはコメントが空でも公開できる",
    kind: "article",
    body: `ブックマークはタイトルと外部 URL が必須です。コメントは空でも公開できます。

記事、ノート、ページは、公開時に本文が空だと \`422 empty_body\` です。

URL は本文とは別の列です。本文に URL を書き写して代わりにはしません。

## タイトルのリンク

公開ホームでは、ブックマークのタイトルがその URL を開きます。記事のタイトルは、このホストの \`/{title}\` です。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-14T06:00:00.000Z",
  },
  {
    id: "entry-note-20261114",
    title: "URLは本文に混ぜない",
    kind: "note",
    body: "クリップしたページの URL は、コメントの末尾に足さない。タイトルのリンク先と二重になるので、コメントは感想だけにしています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-14T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261114",
    title: "Vite",
    kind: "bookmark",
    body: "テストと開発サーバは Vite+ の vp 経由です。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-14T00:00:00.000Z",
    bookmarkUrl: "https://vite.dev/guide/",
  },
  {
    id: "entry-article-20261113",
    title: "タイトルの空白はアンダースコア",
    kind: "article",
    body: `閲覧パスは、タイトルの空白を \`_\` にしたものです。空のタイトルと、予約語にぶつかるタイトルには閲覧パスを付けません。公開の住所は \`/e/{id}\` だけです。

予約している比較キーは \`e\`、\`edit\`、\`entries\`、\`tokens\`、\`feed\`、\`feed.xml\`、\`feed.json\`、\`users\`、\`gyazo\`、\`note-images\`、\`new\`、\`login\`、\`.well-known\`、\`manifest.webmanifest\` です。

古いパスは、今の閲覧パスへ 301 します。閲覧パスが無いときは正規 URL です。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-13T06:00:00.000Z",
  },
  {
    id: "entry-note-20261113",
    title: "パスにしないタイトル",
    kind: "note",
    body: "edit や feed というタイトルは、パスにすると画面やフィードと重なります。そのときは正規 URL だけにしています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-13T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261113",
    title: "Cosense yamanoku",
    kind: "bookmark",
    body: "移設元の公開プロジェクトです。移設後は、こちらから本文を更新しません。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-13T00:00:00.000Z",
    bookmarkUrl: "https://scrapbox.io/yamanoku",
  },
  {
    id: "entry-article-20261112",
    title: "返信はホームに出さない",
    kind: "article",
    body: `返信は公開のノートです。\`publishedAt\` を持たないので、配信対象にはなりません。

出る場所は、そのノートの正規 URL のスレッドだけです。ホーム、人間向けフィード、ActivityPub には出しません。

## 削除

ノートを消しても、他のノートの \`in_reply_to_id\` は書き換えません。消えるのはその1件です。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-12T06:00:00.000Z",
  },
  {
    id: "entry-note-20261112",
    title: "スレッドは詳細だけ",
    kind: "note",
    body: "返信をホームに混ぜると、日付のまとまりが会話で埋まります。会話は正規 URL に置いたままにしています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-12T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261112",
    title: "WAI Tutorials",
    kind: "bookmark",
    body: "ページ構造やメニューの説明を、実装の前に読み返すときがあります。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-12T00:00:00.000Z",
    bookmarkUrl: "https://www.w3.org/WAI/tutorials/",
  },
  {
    id: "entry-article-20261111",
    title: "無料枠を超えたら待つ",
    kind: "article",
    body: `実行環境は Cloudflare の無料枠だけです。有料プランへの自動切り替えはありません。

D1 の1日の書き込み上限に当たったら、その仕事は 00:00 UTC まで待ちます。応答は \`503 store_allowance\` で、アップグレードの文言は入れません。

## このサンプル

件数は、画面の密度を見るためのものです。本番のデータベースには書きません。`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-11T06:00:00.000Z",
  },
  {
    id: "entry-note-20261111",
    title: "件数は画面のため",
    kind: "note",
    body: "10件を超えると、1日の見出しが縦に積まれます。日付の区切りが機能しているかを、この量で見ています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-11T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261111",
    title: "Cloudflare Workers",
    kind: "bookmark",
    body: "このホストは Worker 1つです。無料枠のリクエスト数と CPU を、ここから追っています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-11T00:00:00.000Z",
    bookmarkUrl: "https://developers.cloudflare.com/workers/",
  },
  {
    id: "entry-article-20261110",
    title: "ページは配信しない",
    kind: "article",
    body: `kind が page の公開エントリは、ホームの一覧に出ます。フィードと配送には出しません。配信対象は article、note、bookmark で、\`publishedAt\` があるものだけです。

下書きも公開面には出ません。オーナーは \`/edit\` で読みます。

## サンプルに残しているもの

- \`index-only\` は公開の page で、ホームには出て、配信はしません
- \`draft-thought\` は下書きの note で、公開一覧に入りません`,
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-10T06:00:00.000Z",
  },
  {
    id: "entry-note-20261110",
    title: "下書きは別",
    kind: "note",
    body: "下書きの本文はオーナーだけが読みます。公開のサンプルと並べて保存して、漏れていないかをテストで見ています。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-10T03:00:00.000Z",
  },
  {
    id: "entry-bookmark-20261110",
    title: "デザインシステムの HTML 断片",
    kind: "bookmark",
    body: "見える部品は、ここの HTML 断片に合わせています。レイアウトは手元に写した CSS を読みます。",
    visibility: "public",
    deliverable: true,
    publishedAt: "2026-11-10T00:00:00.000Z",
    bookmarkUrl: "https://github.com/digital-go-jp/design-system-example-components-html",
  },
  {
    id: "entry-index-only",
    title: "index-only",
    kind: "page",
    body: "A public page that is not deliverable.",
    visibility: "public",
    deliverable: false,
    publishedAt: null,
  },
  {
    id: "entry-draft-thought",
    title: "draft-thought",
    kind: "note",
    body: "A draft that stays off the public pages.",
    visibility: "draft",
    deliverable: false,
    publishedAt: null,
  },
];

// Public articles link to every other public article. Spaces in a title are underscores on the path.
function withMutualArticleLinks(rows: CatalogEntry[]): CatalogEntry[] {
  const articles = rows.filter((row) => row.kind === "article" && row.visibility === "public");
  return rows.map((row) => {
    if (!articles.includes(row)) return row;
    const links = articles
      .filter((article) => article.id !== row.id)
      .map((article) => `- [${article.title}](/${article.title.replaceAll(" ", "_")})`)
      .join("\n");
    return {
      ...row,
      body: `${row.body}\n\n## ほかの記事\n\n${links}`,
    };
  });
}

const entries = withMutualArticleLinks(sourceEntries);

export function isReservedTitle(title: string): boolean {
  return reserved.has(title);
}

function byUpdatedThenId(left: CatalogEntry, right: CatalogEntry): number {
  const leftTime = left.updatedAt ?? left.publishedAt ?? "";
  const rightTime = right.updatedAt ?? right.publishedAt ?? "";
  if (leftTime !== rightTime) return leftTime < rightTime ? 1 : -1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

export function deliverableEntries(): CatalogEntry[] {
  return entries.filter((entry) => entry.deliverable).sort(byUpdatedThenId);
}

// The local home list. Public pages join the deliverable entries. Feeds do not.
export function homeEntries(): CatalogEntry[] {
  return entries
    .filter((entry) => entry.visibility === "public" && (entry.deliverable || entry.kind === "page"))
    .sort(byUpdatedThenId);
}

export function publicEntries(): CatalogEntry[] {
  return entries.filter((entry) => entry.visibility === "public");
}

export function publicArticles(): CatalogEntry[] {
  return publicEntries().filter((entry) => entry.kind === "article");
}

export function publicEntryByTitle(title: string): CatalogEntry | null {
  const visible = publicEntries();
  return (
    visible.find((entry) => entry.title === title) ??
    visible.find((entry) => entry.title.replaceAll(" ", "_") === title) ??
    null
  );
}

export function entryById(id: string): CatalogEntry | null {
  return entries.find((entry) => entry.id === id) ?? null;
}
