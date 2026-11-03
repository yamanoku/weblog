# Worker アプリケーションの設計

[English](worker.md)

## このドキュメントについて

この設計は、一つの Worker が [weblog.yamanoku.net](../../products/weblog/product.ja.md) をどう載せるかを決める。同じ Worker が、[所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md)、[公開閲覧](../../products/weblog/features/public-reading/requirements.ja.md)、[ActivityPub](../../products/weblog/features/activitypub/requirements.ja.md)、[Cosense からの取り込み](../../products/weblog/features/cosense-import/requirements.ja.md) を担う。

所有者は、そのアプリケーションに [Void](https://void.cloud/) を選んだ。画面のフレームワークは選んでいない。React、Vue、Svelte、Solid は、未選択のままである。

### 対象読者

この Worker を実装する人と、変更するエージェント。

### 前提知識

上にリンクしたプロダクトと要件。Void は Cloudflare Workers 向けのフルスタックフレームワークであり、Vite を使うと説明している。

### このドキュメントで扱わないこと

- どの画面のフレームワークを使うか。プロダクトは、それを未決のままにしている。
- どの ORM を使うか。保存の第一アダプタは D1 のままである。
- エントリの検証、公開 HTML の規則、連合の挙動、取り込みの歩き方。これらは上の要件に残す。
- 所有者の CLI。CLI は、この Worker を呼ぶ別プロセスのままである。

## 実装方針

成果物は、一つの Cloudflare Worker 上の Void アプリケーション一つである。二つ目の Worker は置かない。

[クイックスタート](https://void.cloud/guide/quickstart) は、`void` パッケージと `void init` でアプリを作り、デプロイする。そのページは、画面のフレームワーク、スタータ、デプロイ先を選ばせる。この設計が答えるのは、デプロイ先と形である。画面のフレームワークには答えない。デプロイ先は、所有者の Cloudflare アカウントである。形は、API だけの Void アプリである。ディレクトリは `routes/` であり、フロントエンドのパッケージは置かない。[対応するアプリの形](https://void.cloud/guide/app-types) は、その形をフロントエンドの無い経路として説明している。

[ページルーティング](https://void.cloud/guide/pages-routing/overview) は、`pages/` があると始まる。ページのコンポーネントは、最初の描画をサーバで行い、その後の移動をブラウザで行う。アダプタは `@void/react`、`@void/vue`、`@void/svelte`、`@void/solid` である。このアプリはページモードを使わない。公開ページは、サーバが描画した HTML のままである。クライアントアプリは無い。編集画面は、HTML フォームのままである。

経路ハンドラが HTTP の入口である。[サーバルーティング](https://void.cloud/guide/server-routing) は、経路とミドルウェアに Hono を使うと説明している。ハンドラはドメインを呼び、その結果を返す。ドメインは `void`、`void/db`、Hono、画面のフレームワーク、ORM、Fedify、Cloudflare SDK を import しない。アダプタは Fedify を使わない。

保存アダプタは、D1 のバインディングを直接使う。`void/db` は import しない。[データベース](https://void.cloud/guide/database) は、`void/db` が Drizzle であると説明している。ORM は未決なので、アダプタはその import を取らない。[D1](https://void.cloud/guide/database/d1) は、素の D1 バインディングがプライマリを読むと説明している。レプリカを使うのは `withSession()` の呼び出しである。アダプタは `withSession()` を呼ばない。同じページは、Void がデータベースを用意するときに読み取りレプリカを有効にすると説明している。このアプリは、そのセッションを使わない。

デプロイは `void deploy --platform cloudflare` である。[デプロイ](https://void.cloud/guide/deployment) は、ネイティブアプリが Workers Free の枠の中で動くと説明している。Sandboxes は Workers Paid と Containers を必要とする。このアプリは Sandboxes を使わない。Void のプラットフォームもインストールしない。[前提条件](https://void.cloud/guide/platform/installation/prerequisites) は、Workers for Platforms が独自の有料プランを必要とすると説明している。[プラットフォームの導入](https://void.cloud/guide/self-hosted-platform) は、一つのアプリを Cloudflare へ直接デプロイするよう案内している。

[Cloudflare](https://void.cloud/integrations/cloudflare) は、別の Worker へのサービスバインディングを任意項目として示している。このアプリは、そのバインディングを足さない。

## アーキテクチャ・シーケンス図

図は要らない。要求は Void の経路ハンドラに入り、その経路を持つ機能へ進む。図を足しても、入口は増えない。

## データモデル・ER 図

無し。この設計は、表を足さない。列も足さない。保存の第一アダプタは、一つの D1 のままである。

## API・インターフェース

接点は、この Worker 上の Void の経路ハンドラである。経路は足さない。入力は、リンクした要件が既に名付けた HTTP 要求である。出力は、その機能の応答である。ドメインを呼べないハンドラは、その機能の失敗ステータスを返し、新しい保存はしない。

デプロイのコマンドは `void deploy --platform cloudflare` である。この一つのアプリを、所有者の Cloudflare アカウントへ公開する。

## 外部サービスとの連携方式

Void は、所有者の Cloudflare アカウントへアプリをデプロイする。出典は、上のクイックスタートとデプロイのページである。アカウントは Workers Free のままである。このアプリは、Workers Paid、Workers for Platforms、Sandboxes を契約しない。

保存先は D1 のバインディングである。KV、キュー、R2 は、リンクした要件が既に使う資源のままである。この設計は、データベース製品を足さない。`void/db` も import しない。

## データの取り扱い設計

この設計は、保存する記録を足さない。経路ハンドラは、アクターの秘密鍵、所有者のトークン、Access の JWT をログへ書かない。これらの資格は、元から持つ機能に残す。

## 認証認可に関する特記事項

リンクした要件を超える特記は無い。[認証](https://void.cloud/guide/auth) は、ネイティブな Void アプリに、メールとパスワードの認証を用意している。このアプリは、それを有効にしない。ブラウザのログインは、所有者の書き込みの要件のままである。

## セキュリティ上の留意事項

ドメインは、`void`、`void/db`、Hono、React、Vue、Svelte、Solid、ORM、Fedify、Cloudflare SDK を import しない。アダプタは Fedify を使わない。ハンドラが D1 のバインディングか Void の入口を必要とするとき、その import はアダプタに残す。画面のフレームワークは選んでいないので、アダプタは画面のフレームワークを import しない。

## デプロイに関する特記事項

`void deploy --platform cloudflare` で公開する。Void のプラットフォームはインストールしない。Sandboxes は有効にしない。二つ目の Worker は足さない。ホスト名は `weblog.yamanoku.net` のままである。

## 検討した代替手段

### React、Vue、Svelte、Solid

[renderToReadableStream](https://react.dev/reference/react-dom/server/renderToReadableStream) は、React の木を Web Stream へ描画する。`bootstrapScripts` を省くと、クライアントで React は動かない。[Vue のサーバレンダラ](https://vuejs.org/api/ssr.html) は、`renderToString` と `pipeToWebWritable` を出す。Vue のページは、`TransformStream` が使える環境として Cloudflare Workers を挙げている。[svelte/server](https://svelte.dev/docs/svelte/svelte-server) の `render` は、サーバで HTML の `head` と `body` を返す。[renderToString](https://docs.solidjs.com/reference/rendering/render-to-string) は、サーバで Solid の HTML を描画し、ハイドレーション用の印を含む。Solid の [Cloudflare ガイド](https://docs.solidjs.com/guides/deployment-options/cloudflare) は、`dist` を `wrangler pages deploy` で置く。これは静的な Pages の出力である。

四つとも、描画アダプタに置けばドメインへ入れずに済む。どのページも、Workers Paid を必要とは書いていない。所有者は、どれも選んでいない。ページモードは、選んだライブラリをブラウザでも動かす。このプロダクトに、クライアントアプリは無い。編集画面は、HTML フォームのままである。

### Worker を SvelteKit にする

[adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) は、`main` が `.svelte-kit/cloudflare/_worker.js` の Worker を作り、アセットのバインディングを持つ。SvelteKit が Worker の入口になる。所有者は、Void のアプリを選んだ。

### `void/db` と Drizzle

`void/db` は型付きのクエリを出す。データベースのページは、Void が Drizzle を含むと説明している。ORM は未決である。保存の第一アダプタは、D1 のバインディングのままである。ドメインは ORM を import しない。このアダプタも `void/db` を import しない。

### Void のプラットフォーム

プラットフォームは、共有のアクセスと、残るデプロイ履歴を足す。前提条件のページは、Workers for Platforms が独自の有料プランを必要とすると説明している。このプロダクトは、そのプランを契約しない。一つのアプリは、所有者の Cloudflare アカウントへデプロイする。

### Sandboxes

Sandboxes は、分離した実行のための Void の実行環境である。デプロイのページは、Workers Paid と Containers を必要とすると説明している。このアプリは、Sandboxes を使わない。

### 手書きの Worker 入口

アプリケーションフレームワークを置かない Worker は、`void` パッケージを避けられる。経路は一つの Worker のままであり、ドメインの境界も同じである。所有者は Void を選んだ。入口は、Void の経路ハンドラである。

## 未決事項

どの画面のフレームワークを使うかは未決である。画面の製品は、まだ選んでいない。所有者が一つを選ぶまで、このアプリは React、Vue、Svelte、Solid を import しない。`pages/` も足さない。クライアントアプリも動かさない。編集画面は、HTML フォームのままである。

どの ORM を使うかは未決である。この設計は `void/db` を選ばない。Drizzle も選ばない。
