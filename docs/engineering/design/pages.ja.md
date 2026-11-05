# ページ構成

[English](pages.md)

## このドキュメントについて

この設計は、[weblog.yamanoku.net](../../products/weblog/product.ja.md) の各 HTTP 経路を、Svelte のページか、ページでない経路かへ割り当てる。各経路の挙動は、[所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md)、[公開閲覧](../../products/weblog/features/public-reading/requirements.ja.md)、[ActivityPub](../../products/weblog/features/activitypub/requirements.ja.md) に残す。[Cosense からの取り込み](../../products/weblog/features/cosense-import/requirements.ja.md) は、このホストに経路を足さない。

### 対象読者

これらの経路を実装する人と、変更するエージェント。

### 前提知識

上にリンクした要件。このホストは、一つの Void アプリケーションが返す。画面のライブラリは Svelte である。公開 HTML と編集画面は、最初の HTML のあとブラウザで動く。

### このドキュメントで扱わないこと

- 項目の検証、フィードの文書、空ページの HTML、draft の規則。これらは上の要件に残す。
- 連合の署名、キュー、活動文書の中身。これらは ActivityPub の要件に残す。
- 所有者の CLI。CLI はこのホストを呼ぶ。ここにはページを持たない。
- 見た目。

## 実装方針

成果物は、要件が既に名付けた経路の一覧である。この設計は経路を足さない。

[ページルーティング](https://void.cloud/guide/pages-routing/overview) は、`pages/` があると始まると説明している。`routes/` と並べて置ける。ページの最初の要求は、描画された HTML を受け取る。このホスト内の後の移動は、ローダを実行し、文書を読み直さずにページを更新する。公開 HTML と編集画面は、そのモードを使う。画面のアダプタは `@void/svelte` である。このアプリは `ssr = false` を出さない。Void の `sourceDir` は `src` である。これらのディレクトリは `src/pages/` と `src/routes/` である。`npm run dev`、`npm run build`、デプロイは、リポジトリのルートから実行する。`void.config.ts`、`vite.config.js`、`package.json` は、そこに残す。

HTML のページでない経路は `src/routes/` に置く。フィード、画像のバイト列、Activity Streams、所有者向けの JSON API がそれである。ローダはドメインを呼び、props を返す。action は、CLI と同じ書き込み処理を呼ぶ。ドメインは Svelte を import しない。ドメインは `void/db` を import しない。ページのファイルは `void/db` を import しない。

Worker は、タイトルの経路より前に固定の経路を一致させる。タイトルはパス要素一つである。所有者の書き込みは、次の比較キーを予約する。タイトルは、その URL を取らない。キーは `e`、`edit`、`entries`、`tokens`、`feed`、`feed.xml`、`feed.json`、`pages`、`users`、`gyazo`、`.well-known` である。

## アーキテクチャ・シーケンス図

図は要らない。下の表が一覧である。図を足しても、経路は増えない。

## データモデル・ER 図

無し。この設計は、表を足さない。列も足さない。

## API・インターフェース

絶対 URL のホストは `https://weblog.yamanoku.net` である。要求の Host ヘッダでは、これを変えない。

### Svelte のページ

これらのファイルは `src/pages/` に置く。最初の応答は HTML である。そのあと、この表の別のページへの移動はブラウザで行う。文書全体は置き換えない。直接の要求は、リンクした要件が定めるステータスを返す。

| 経路 | 役割 |
| --- | --- |
| `GET /` | 配送対象の HTML 一覧。続きは、この経路に `before` と `before_id` を付ける。 |
| `GET /pages` | 公開タイトルの HTML 一覧。続きは、同じ形のカーソルを使う。 |
| `GET /{タイトル}` | 公開エントリ。要件が空ページとするときは、空ページである。 |
| `GET /e/{id}` | 正規 URL の HTML。下の Activity Streams の場合を除く。 |
| `GET /edit` | 空の作成フォーム。 |
| `GET /edit/{id}` | そのエントリの編集フォーム。 |
| `POST /edit` | 作成。 |
| `POST /edit/{id}` | 更新。 |
| `POST /edit/tokens` | ブラウザからの CLI トークンの発行と再発行。 |

公開の旧タイトルのパスは、所有者の書き込みと公開閲覧が定める移転に従う。移転先は、今の閲覧用パスである。閲覧用パスが無いときは、正規 URL である。draft は、その移転先にしない。

### ページでない経路

これらのハンドラは `routes/` に置く。Svelte のページ間のブラウザ移動の外である。

| 経路 | 役割 |
| --- | --- |
| `GET /feed.xml` | 配送対象すべての Atom。 |
| `GET /feed.json` | 同じ対象の JSON Feed。 |
| `GET /feed/articles.xml` | 記事の Atom。 |
| `GET /feed/notes.xml` | ノートの Atom。 |
| `GET /feed/bookmarks.xml` | ブックマークの Atom。 |
| `GET /gyazo/{imageId}.{拡張子}` | 画像のバイト列。画像 ID の無い `GET /gyazo` は、この経路ではない。 |
| `GET /e/{id}` | Accept が Activity Streams を求め、HTML も `*/*` も受け付けないときの活動オブジェクト。 |
| `GET /.well-known/webfinger` | このアカウントの解決。 |
| `GET /users/yamanoku` | アクター文書。 |
| `GET /users/yamanoku/outbox` | 配送した活動。 |
| `GET /users/yamanoku/followers` | 今のフォロワー。 |
| `GET /users/yamanoku/s/{uuid}` | 活動文書一つ。この経路に HTML のページは無い。 |
| `POST /users/yamanoku/inbox` | inbox。 |
| `POST /inbox` | 同じ inbox。どちらの inbox も、GET は 405 である。 |
| `POST /entries` | CLI の作成。 |
| `GET /entries` | 所有者の一覧。 |
| `GET /entries/{id}` | 所有者の一件。 |
| `POST /tokens` | Bearer によるトークンの再発行。 |

フィードの続きは、フィードの経路に残す。種類別の JSON Feed は無い。page は、所有者が種類を変えるまでフィードに入らない。

`GET /e/{id}` は URL 一つである。Activity Streams の Accept は、Svelte のページより前に判定する。HTML のページは、活動文書を描かない。

## 外部サービスとの連携方式

ここでの追加は無い。Cloudflare Access、D1、リモートの inbox は、既に使う要件に残す。

## データの取り扱い設計

この設計は、保存する記録を足さない。ページが受け取るのは、ローダの props である。ページは D1 を読まない。

## 認証認可に関する特記事項

Access が覆うのは `/edit` と `/edit/*` だけである。公開 HTML、フィード、WebFinger、どちらの inbox、`/entries` も、そのログインの外である。各経路の資格は、上の要件に残す。

## セキュリティ上の留意事項

ページのファイルは、`@void/svelte` を通して Svelte を import する。`void/db`、Cloudflare SDK、Fedify は import しない。経路ハンドラはドメインを呼ぶ。ドメインは Svelte を import しない。

## デプロイに関する特記事項

無し。このアプリの公開は、経路を足さない。ホスト名も変えない。

## 検討した代替手段

### フィードを Svelte のページにする

フィードの URL は、ブラウザのページになる。公開閲覧は、その経路に Atom、JSON Feed、画像のバイト列を求める。それらの応答は `src/routes/` に残す。

### 編集画面を `src/pages/` の外に置く

編集フォームは、ブラウザ移動の無い経路になる。所有者の書き込みは、編集画面が最初の HTML のあとブラウザで動くことを求める。フォームは `src/pages/` に残す。

## 未決事項

この一覧を止める未決は無い。
