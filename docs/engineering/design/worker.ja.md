# Worker アプリケーションの設計

[English](worker.md)

## このドキュメントについて

この設計は、一つの Worker が [weblog.yamanoku.net](../../products/weblog/product.ja.md) をどう載せるかを決める。同じ Worker が、[所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md)、[公開閲覧](../../products/weblog/features/public-reading/requirements.ja.md)、[ActivityPub](../../products/weblog/features/activitypub/requirements.ja.md)、[Cosense からの取り込み](../../products/weblog/features/cosense-import/requirements.ja.md) を担う。

所有者は、そのアプリケーションに [Void](https://void.cloud/) を選んだ。画面のフレームワークは Svelte である。React、Vue、Solid は選んでいない。SvelteKit は、この Worker を持たない。

### 対象読者

この Worker を実装する人と、変更するエージェント。

### 前提知識

上にリンクしたプロダクトと要件。Void は Cloudflare Workers 向けのフルスタックフレームワークであり、Vite を使うと説明している。

### このドキュメントで扱わないこと

- エントリの検証、公開 HTML の規則、連合の挙動、取り込みの歩き方。これらは上の要件に残す。
- 所有者の CLI。CLI は、この Worker を呼ぶ別プロセスのままである。

## 実装方針

成果物は、一つの Cloudflare Worker 上の Void アプリケーション一つである。二つ目の Worker は置かない。

[クイックスタート](https://void.cloud/guide/quickstart) は、`void` パッケージと `void init` でアプリを作り、デプロイする。そのページは、画面のフレームワーク、スタータ、デプロイ先を選ばせる。この設計が答えるのは、Svelte、ページモード、所有者の Cloudflare アカウントである。

[ページルーティング](https://void.cloud/guide/pages-routing/overview) は、`pages/` があると始まると説明している。`routes/` と並べて置ける。ページのコンポーネントは、通常、最初の描画をサーバで行い、その後の移動と操作をブラウザで行う。最初の要求は、描画された HTML を受け取る。その後の移動は、ローダを実行し、文書を読み直さずにページを更新する。このアプリは、そのモードを使う。画面のアダプタは `@void/svelte` である。Vite のプラグインは、`@void/svelte/plugin` の `voidSvelte()` である。同じページは `@void/react`、`@void/vue`、`@void/solid` も示している。このアプリは、それらをインストールしない。公開の HTML ページと編集画面は `src/pages/` に置く。ページでない HTTP は `src/routes/` に残す。このアプリは `ssr = false` を出さない。その指定は、サーバが描画したコンポーネントの HTML ではなく、ブラウザで載せる殻を返す。同じページの表が、その行の出典である。

Void の `sourceDir` は `src` である。`pages/`、`routes/`、`middleware/`、`db/` を含むアプリケーションのソースは、そのディレクトリの下に置く。`void.config.ts`、`vite.config.ts`、`package.json` はリポジトリのルートに残す。`npm run dev`、`npm run build`、デプロイは、そのルートから実行し、`src/` を読む。

[サーバルーティング](https://void.cloud/guide/server-routing) は、経路とミドルウェアに Hono を使うと説明している。経路ハンドラはドメインを呼び、その結果を返す。ドメインは `void`、`void/db`、Hono、Svelte、`@void/svelte`、ORM、Fedify、Cloudflare SDK を import しない。ページのファイルは、`@void/svelte` を通して Svelte を import する。連合のアダプタは Fedify を使わない。

保存アダプタは、D1 のバインディング上で `void/db` の `db` を使って問い合わせる。データベースのページは、`void/db` を Drizzle だと説明している。出典は [データベース](https://void.cloud/guide/database) である。D1 のページは、この問い合わせがリクエストごとに D1 のセッションを使うと説明している。読み取りは、リクエストの近くで行える。同じリクエスト内の後続の問い合わせは、少なくとも同じデータを見る。リクエストをまたぐと、レプリカの内容は遅れることがある。データベースを用意するとき、Void は読み取りレプリカを有効にする。出典は [D1](https://void.cloud/guide/database/d1) である。ドメインは `void/db` を import しない。ページのファイルは、それを import しない。

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

保存先は D1 のバインディングである。保存アダプタは `void/db` を import する。KV、キュー、R2 は、リンクした要件が既に使う資源のままである。この設計は、データベース製品を足さない。

## データの取り扱い設計

この設計は、保存する記録を足さない。経路ハンドラは、アクターの秘密鍵、所有者のトークン、Access の JWT をログへ書かない。これらの資格は、元から持つ機能に残す。

## 認証認可に関する特記事項

リンクした要件を超える特記は無い。[認証](https://void.cloud/guide/auth) は、ネイティブな Void アプリに、メールとパスワードの認証を用意している。このアプリは、それを有効にしない。ブラウザのログインは、所有者の書き込みの要件のままである。

## セキュリティ上の留意事項

ドメインは、`void`、`void/db`、Hono、Svelte、`@void/svelte`、Fedify、Cloudflare SDK を import しない。保存アダプタは `void/db` を import する。ページのファイルは、`@void/svelte` を通して Svelte を import する。連合のアダプタは Fedify を使わない。ハンドラが D1 のバインディングか Void の入口を必要とするとき、その import はアダプタに残す。保存アダプタは Svelte を import しない。

## デプロイに関する特記事項

リポジトリのルートから `void deploy --platform cloudflare` で公開する。このコマンドは、アプリケーションのソースを `src/` から読む。Void のプラットフォームはインストールしない。Sandboxes は有効にしない。二つ目の Worker は足さない。ホスト名は `weblog.yamanoku.net` のままである。

## 検討した代替手段

### React、Vue、Solid

[renderToReadableStream](https://react.dev/reference/react-dom/server/renderToReadableStream) は、React の木を Web Stream へ描画する。`bootstrapScripts` を省くと、クライアントで React は動かない。[Vue のサーバレンダラ](https://vuejs.org/api/ssr.html) は、`renderToString` と `pipeToWebWritable` を出す。Vue のページは、`TransformStream` が使える環境として Cloudflare Workers を挙げている。[renderToString](https://docs.solidjs.com/reference/rendering/render-to-string) は、サーバで Solid の HTML を描画し、ハイドレーション用の印を含む。Solid の [Cloudflare ガイド](https://docs.solidjs.com/guides/deployment-options/cloudflare) は、`dist` を `wrangler pages deploy` で置く。これは静的な Pages の出力である。

三つとも、描画アダプタに置けばドメインへ入れずに済む。どのページも、Workers Paid を必要とは書いていない。所有者は Svelte を選んだ。このアプリは `@void/react`、`@void/vue`、`@void/solid` をインストールしない。

### Worker を SvelteKit にする

[adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) は、`main` が `.svelte-kit/cloudflare/_worker.js` の Worker を作り、アセットのバインディングを持つ。SvelteKit が Worker の入口になる。所有者は、入口を Void のままにし、画面を Svelte にした。このアプリは `@sveltejs/adapter-cloudflare` をインストールしない。

### 素の D1 バインディング

素の D1 バインディングはプライマリを読む。D1 のページは、ほかの問い合わせライブラリがレプリカを使うには、各自の `withSession()` が要ると説明している。所有者は `void/db` を選んだ。アダプタは、そのライブラリのセッションを Void のリクエストごとに使う。ドメインは `void/db` を import しない。

### Void のプラットフォーム

プラットフォームは、共有のアクセスと、残るデプロイ履歴を足す。前提条件のページは、Workers for Platforms が独自の有料プランを必要とすると説明している。このプロダクトは、そのプランを契約しない。一つのアプリは、所有者の Cloudflare アカウントへデプロイする。

### Sandboxes

Sandboxes は、分離した実行のための Void の実行環境である。デプロイのページは、Workers Paid と Containers を必要とすると説明している。このアプリは、Sandboxes を使わない。

### 手書きの Worker 入口

アプリケーションフレームワークを置かない Worker は、`void` パッケージを避けられる。経路は一つの Worker のままであり、ドメインの境界も同じである。所有者は Void を選んだ。入口は、Void の経路ハンドラである。

## 未決事項

この Worker を止める未決は無い。
